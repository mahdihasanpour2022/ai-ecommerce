import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, test } from 'node:test';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { jwtVerify } from 'jose';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/application';
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
} from '../src/authentication/authentication.constants';
import { AuthenticationCrypto } from '../src/authentication/authentication.crypto';
import { AuthenticationRepository } from '../src/authentication/authentication.repository';
import type { ApiEnvironment, RuntimeEnvironment } from '../src/config/environment';
import { PrismaService } from '../src/database/prisma.service';
import { createTestEnvironment } from './test-environment';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const allowedOrigin = 'http://localhost:3001';

interface TestContext {
  app: INestApplication;
  environment: ApiEnvironment;
  prisma: PrismaService;
  crypto: AuthenticationCrypto;
}

function server(app: INestApplication): App {
  return app.getHttpServer() as App;
}

function rawCookie(cookies: string[], name: string): string {
  const cookie = cookies.find((value) => value.startsWith(`${name}=`));
  assert.ok(cookie);
  return cookie.slice(name.length + 1, cookie.indexOf(';'));
}

function responseCookies(headers: unknown): string[] {
  const value = (headers as Record<string, unknown>)['set-cookie'];
  assert.ok(Array.isArray(value));
  assert.ok((value as unknown[]).every((cookie) => typeof cookie === 'string'));
  return value as string[];
}

async function createContext(
  nodeEnv: RuntimeEnvironment = 'test',
  overrides: Readonly<Record<string, string | undefined>> = {},
): Promise<TestContext> {
  assert.ok(testDatabaseUrl);
  const environment = createTestEnvironment(nodeEnv, {
    DATABASE_URL: testDatabaseUrl,
    ...overrides,
  });
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule.forRoot(environment)],
  }).compile();
  const app = moduleRef.createNestApplication({ logger: false });
  configureApplication(app, environment);
  await app.init();
  return {
    app,
    environment,
    prisma: moduleRef.get(PrismaService),
    crypto: moduleRef.get(AuthenticationCrypto),
  };
}

async function createAdmin(
  context: TestContext,
  options: { disabled?: boolean; eligible?: boolean; weakHash?: boolean } = {},
): Promise<{ email: string; password: string; id: string }> {
  const email = `login-${randomUUID()}@example.invalid`;
  const password = randomBytes(32).toString('base64url');
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65_536,
    timeCost: options.weakHash === true ? 2 : 3,
    parallelism: 1,
    hashLength: 32,
  });
  const role = await context.prisma.role.findUniqueOrThrow({ where: { code: 'SUPER_ADMIN' } });
  const admin = await context.prisma.adminUser.create({
    data: {
      email,
      displayName: 'Login Integration Admin',
      passwordHash,
      disabledAt: null,
      ...(options.eligible === false ? {} : { roles: { create: { roleId: role.id } } }),
    },
  });
  if (options.disabled === true) {
    await context.prisma.adminUser.update({
      where: { id: admin.id },
      data: { disabledAt: new Date() },
    });
  }
  return { email, password, id: admin.id };
}

function login(app: INestApplication, email: string, password: string, origin = allowedOrigin) {
  return request(server(app))
    .post('/api/v1/auth/login')
    .set('Origin', origin)
    .set('Sec-Fetch-Site', 'same-origin')
    .send({ email, password });
}

void describe(
  'Admin login PostgreSQL and HTTP contract',
  { skip: testDatabaseUrl === undefined, concurrency: 1 },
  () => {
    const contexts: TestContext[] = [];

    void beforeEach(async () => {
      const context = await createContext();
      contexts.push(context);
      await context.prisma.authSession.deleteMany();
      await context.prisma.adminLoginThrottle.deleteMany();
      await context.prisma.adminUser.deleteMany();
    });

    void afterEach(async () => {
      const cleanup = contexts[0];
      if (cleanup !== undefined) {
        await cleanup.prisma.authSession.deleteMany();
        await cleanup.prisma.adminLoginThrottle.deleteMany();
        await cleanup.prisma.adminUser.deleteMany();
      }
      while (contexts.length > 0) await contexts.pop()?.app.close();
    });

    void test('issues cookies and CSRF while persisting only hashes and identity-only JWT claims', async () => {
      const context = contexts[0];
      assert.ok(context);
      const admin = await createAdmin(context);

      const response = await login(context.app, `  ${admin.email.toUpperCase()} `, admin.password)
        .expect(200)
        .expect('Cache-Control', 'no-store');
      const body = response.body as Record<string, unknown>;
      assert.deepEqual(Object.keys(body), ['csrfToken']);
      assert.equal(typeof body.csrfToken, 'string');
      assert.match(body.csrfToken as string, /^[A-Za-z0-9_-]{43}$/u);

      const cookies = responseCookies(response.headers);
      assert.equal(cookies.length, 2);
      for (const cookie of cookies) {
        assert.match(cookie, /; Path=\/;/u);
        assert.match(cookie, /; HttpOnly;/u);
        assert.match(cookie, /; SameSite=Lax/u);
        assert.doesNotMatch(cookie, /; Domain=/iu);
        assert.doesNotMatch(cookie, /; Secure/iu);
      }

      const accessToken = rawCookie(cookies, ACCESS_COOKIE_NAME);
      const refreshToken = rawCookie(cookies, REFRESH_COOKIE_NAME);
      assert.match(refreshToken, /^[A-Za-z0-9_-]{43}$/u);
      assert.equal(body.accessToken, undefined);
      assert.equal(body.refreshToken, undefined);
      const protectedHeader = JSON.parse(
        Buffer.from(accessToken.split('.')[0] ?? '', 'base64url').toString('utf8'),
      ) as Record<string, unknown>;
      assert.deepEqual(protectedHeader, { alg: 'EdDSA', typ: 'at+jwt', kid: 'test-key' });
      const activePublicKey = context.environment.authentication.jwtPublicKeys.get('test-key');
      assert.ok(activePublicKey);
      const { payload: claims } = await jwtVerify(accessToken, activePublicKey, {
        algorithms: ['EdDSA'],
        typ: 'at+jwt',
        issuer: context.environment.authentication.jwtIssuer,
        audience: context.environment.authentication.jwtAudience,
        requiredClaims: ['sub', 'sid', 'jti', 'iat', 'exp'],
      });
      assert.equal(claims.sub, admin.id);
      assert.equal(typeof claims.sid, 'string');
      assert.equal(claims.roles, undefined);
      assert.equal(claims.permissions, undefined);
      assert.equal((claims.exp as number) - (claims.iat as number), 900);

      const session = await context.prisma.authSession.findUniqueOrThrow({
        where: { id: claims.sid as string },
        include: { refreshTokens: true, refreshThrottle: true },
      });
      assert.equal(session.adminUserId, admin.id);
      assert.equal(session.refreshTokens.length, 1);
      assert.ok(session.refreshThrottle);
      assert.deepEqual(
        Buffer.from(session.csrfTokenHash),
        createHash('sha256')
          .update(body.csrfToken as string)
          .digest(),
      );
      assert.deepEqual(
        Buffer.from(session.refreshTokens[0]?.tokenHash ?? []),
        createHash('sha256').update(refreshToken).digest(),
      );
      assert.notEqual(Buffer.from(session.csrfTokenHash).toString('utf8'), body.csrfToken);
      assert.equal(await context.prisma.adminLoginThrottle.count(), 0);
    });

    void test('makes unknown, wrong-password, disabled, and ineligible outcomes identical', async () => {
      const context = contexts[0];
      assert.ok(context);
      const wrong = await createAdmin(context);
      const disabled = await createAdmin(context, { disabled: true });
      const ineligible = await createAdmin(context, { eligible: false });
      const attempts = [
        [`unknown-${randomUUID()}@example.invalid`, randomBytes(32).toString('base64url')],
        [wrong.email, randomBytes(32).toString('base64url')],
        [disabled.email, disabled.password],
        [ineligible.email, ineligible.password],
      ] as const;
      const responses = [];
      for (const [email, password] of attempts) {
        responses.push(await login(context.app, email, password).expect(401));
      }
      for (const response of responses) {
        assert.deepEqual(response.body, {
          statusCode: 401,
          code: 'INVALID_CREDENTIALS',
          message: 'اطلاعات ورود نادرست است.',
          details: [],
        });
        assert.equal(response.headers['set-cookie'], undefined);
        assert.equal(response.headers['cache-control'], 'no-store');
      }
      assert.equal(await context.prisma.authSession.count(), 0);
      assert.equal(await context.prisma.refreshToken.count(), 0);
    });

    void test('rejects malformed and cross-site requests before credential persistence', async () => {
      const context = contexts[0];
      assert.ok(context);
      await request(server(context.app))
        .post('/api/v1/auth/login')
        .set('Origin', allowedOrigin)
        .send({ email: 'not-an-email', password: 'x', extra: true })
        .expect(400);
      await login(
        context.app,
        `unknown-${randomUUID()}@example.invalid`,
        randomBytes(32).toString('base64url'),
        'https://attacker.example',
      )
        .expect(403)
        .expect((response) => {
          assert.equal(response.headers['access-control-allow-origin'], undefined);
        });
      await request(server(context.app))
        .post('/api/v1/auth/login')
        .set('Origin', allowedOrigin)
        .set('Sec-Fetch-Site', 'cross-site')
        .send({
          email: `unknown-${randomUUID()}@example.invalid`,
          password: randomBytes(32).toString('base64url'),
        })
        .expect(403);
      await request(server(context.app))
        .post('/api/v1/auth/login')
        .set('Referer', `${allowedOrigin}/login`)
        .send({
          email: `referer-${randomUUID()}@example.invalid`,
          password: randomBytes(32).toString('base64url'),
        })
        .expect(401);
      await request(server(context.app))
        .post('/api/v1/auth/login')
        .send({
          email: `no-origin-${randomUUID()}@example.invalid`,
          password: randomBytes(32).toString('base64url'),
        })
        .expect(403);
      assert.equal(await context.prisma.authSession.count(), 0);
    });

    void test('enforces durable concurrent account and process-local IP limits with Retry-After', async () => {
      const base = contexts[0];
      assert.ok(base);
      await base.app.close();
      contexts.pop();
      const accountContext = await createContext('test', {
        AUTH_LOGIN_ACCOUNT_FAILURE_LIMIT: '2',
        AUTH_LOGIN_IP_LIMIT: '20',
      });
      contexts.push(accountContext);
      const email = `concurrent-${randomUUID()}@example.invalid`;
      const password = randomBytes(32).toString('base64url');
      const results = await Promise.all(
        Array.from({ length: 6 }, () => login(accountContext.app, email, password)),
      );
      assert.equal(results.filter((response) => response.status === 401).length, 2);
      assert.equal(results.filter((response) => response.status === 429).length, 4);
      for (const response of results.filter((candidate) => candidate.status === 429)) {
        assert.match(response.headers['retry-after'] as string, /^\d+$/u);
        assert.equal((response.body as { code: string }).code, 'AUTH_RATE_LIMITED');
      }

      await accountContext.prisma.adminLoginThrottle.deleteMany();
      const ipContext = await createContext('test', {
        AUTH_LOGIN_ACCOUNT_FAILURE_LIMIT: '10',
        AUTH_LOGIN_IP_LIMIT: '2',
      });
      contexts.push(ipContext);
      for (let index = 0; index < 2; index += 1) {
        await login(
          ipContext.app,
          `ip-${index}-${randomUUID()}@example.invalid`,
          randomBytes(32).toString('base64url'),
        ).expect(401);
      }
      const limited = await login(
        ipContext.app,
        `ip-limit-${randomUUID()}@example.invalid`,
        randomBytes(32).toString('base64url'),
      ).expect(429);
      assert.match(limited.headers['retry-after'] as string, /^\d+$/u);
    });

    void test('rehashes on success and rolls back a transaction that cannot insert its token', async () => {
      const context = contexts[0];
      assert.ok(context);
      const admin = await createAdmin(context, { weakHash: true });
      const before = await context.prisma.adminUser.findUniqueOrThrow({ where: { id: admin.id } });
      await login(context.app, admin.email, admin.password).expect(200);
      const after = await context.prisma.adminUser.findUniqueOrThrow({ where: { id: admin.id } });
      assert.notEqual(after.passwordHash, before.passwordHash);
      assert.equal(
        argon2.needsRehash(after.passwordHash, {
          memoryCost: 65_536,
          timeCost: 3,
          parallelism: 1,
          version: 0x13,
        }),
        false,
      );

      const repository = context.app.get(AuthenticationRepository);
      const first = await context.crypto.issueLoginCredentials(admin.id);
      const second = await context.crypto.issueLoginCredentials(admin.id);
      await repository.commitSuccessfulLogin(
        admin.id,
        context.crypto.identifierKey(`bucket-${randomUUID()}@example.invalid`),
        first,
        null,
      );
      const colliding = { ...second, refreshTokenHash: first.refreshTokenHash };
      await assert.rejects(
        repository.commitSuccessfulLogin(
          admin.id,
          context.crypto.identifierKey(`bucket-${randomUUID()}@example.invalid`),
          colliding,
          null,
        ),
      );
      assert.equal(await context.prisma.authSession.count({ where: { id: second.sessionId } }), 0);
    });

    void test('adds Secure cookies in production and exposes exact OpenAPI response metadata', async () => {
      const base = contexts[0];
      assert.ok(base);
      const admin = await createAdmin(base);
      await base.app.close();
      contexts.pop();
      const production = await createContext('production');
      contexts.push(production);
      const response = await login(production.app, admin.email, admin.password).expect(200);
      const cookies = responseCookies(response.headers);
      assert.ok(cookies.every((cookie) => cookie.includes('; Secure')));

      await production.app.close();
      contexts.pop();
      const documentation = await createContext('test');
      contexts.push(documentation);
      const openApi = await request(server(documentation.app)).get('/api/docs-json').expect(200);
      const operation = (
        openApi.body as {
          paths: Record<string, { post?: { responses?: Record<string, unknown> } }>;
        }
      ).paths['/api/v1/auth/login']?.post;
      assert.ok(operation);
      assert.deepEqual(Object.keys(operation.responses ?? {}).sort(), [
        '200',
        '400',
        '401',
        '403',
        '429',
        '500',
      ]);
      assert.match(JSON.stringify(operation), /Retry-After/u);
      assert.match(JSON.stringify(operation), /Set-Cookie/u);
      assert.doesNotMatch(JSON.stringify(operation), /admin_access_token=/u);
    });
  },
);
