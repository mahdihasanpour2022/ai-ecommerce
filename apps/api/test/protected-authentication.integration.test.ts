import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, test } from 'node:test';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { SignJWT } from 'jose';
import request from 'supertest';
import type { Response } from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/application';
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
} from '../src/authentication/authentication.constants';
import { AuthenticationCrypto } from '../src/authentication/authentication.crypto';
import { AuthenticationRepository } from '../src/authentication/authentication.repository';
import type { ApiEnvironment } from '../src/config/environment';
import { PrismaService } from '../src/database/prisma.service';
import { createTestEnvironment } from './test-environment';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const allowedOrigin = 'http://localhost:3001';

interface Context {
  app: INestApplication;
  environment: ApiEnvironment;
  prisma: PrismaService;
  crypto: AuthenticationCrypto;
  repository: AuthenticationRepository;
}

interface AdminCredential {
  id: string;
  email: string;
  password: string;
}

function server(app: INestApplication): App {
  return app.getHttpServer() as App;
}

function responseCookies(headers: unknown): string[] {
  const value = (headers as Record<string, unknown>)['set-cookie'];
  assert.ok(Array.isArray(value));
  assert.ok((value as unknown[]).every((cookie) => typeof cookie === 'string'));
  return value as string[];
}

function cookiePair(cookies: string[], name: string): string {
  const cookie = cookies.find((candidate) => candidate.startsWith(`${name}=`));
  assert.ok(cookie);
  return cookie.slice(0, cookie.indexOf(';'));
}

async function startContext(
  overrides: Readonly<Record<string, string | undefined>> = {},
): Promise<Context> {
  assert.ok(testDatabaseUrl);
  const environment = createTestEnvironment('test', {
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
    repository: moduleRef.get(AuthenticationRepository),
  };
}

async function createAdmin(context: Context): Promise<AdminCredential> {
  const role = await context.prisma.role.findUniqueOrThrow({ where: { code: 'SUPER_ADMIN' } });
  const password = randomBytes(32).toString('base64url');
  const admin = await context.prisma.adminUser.create({
    data: {
      email: `protected-${randomUUID()}@example.invalid`,
      displayName: 'Protected Integration Admin',
      passwordHash: await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 65_536,
        timeCost: 3,
        parallelism: 1,
        hashLength: 32,
      }),
      roles: { create: { roleId: role.id } },
    },
  });
  return { id: admin.id, email: admin.email, password };
}

async function login(context: Context, admin: AdminCredential) {
  return request(server(context.app))
    .post('/api/v1/auth/login')
    .set('Origin', allowedOrigin)
    .set('Sec-Fetch-Site', 'same-origin')
    .send({ email: admin.email, password: admin.password })
    .expect(200);
}

async function signAccess(
  environment: ApiEnvironment,
  adminId: string,
  sessionId: string,
  options: {
    kid?: string;
    issuer?: string;
    audience?: string | string[];
    typ?: string;
    extraHeader?: Record<string, string>;
    extraPayload?: Record<string, unknown>;
    issuedAt?: number;
  } = {},
): Promise<string> {
  const issuedAt = options.issuedAt ?? Math.floor(Date.now() / 1000);
  return new SignJWT({ sid: sessionId, ...options.extraPayload })
    .setProtectedHeader({
      alg: 'EdDSA',
      typ: options.typ ?? 'at+jwt',
      kid: options.kid ?? environment.authentication.jwtActiveKid,
      ...options.extraHeader,
    })
    .setSubject(adminId)
    .setIssuer(options.issuer ?? environment.authentication.jwtIssuer)
    .setAudience(options.audience ?? environment.authentication.jwtAudience)
    .setJti(randomUUID())
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + environment.authentication.accessTokenTtlSeconds)
    .sign(environment.authentication.jwtPrivateKey);
}

void describe(
  'protected Admin authentication PostgreSQL and HTTP contract',
  { skip: testDatabaseUrl === undefined, concurrency: 1 },
  () => {
    const contexts: Context[] = [];

    void beforeEach(async () => {
      const context = await startContext();
      contexts.push(context);
      await context.prisma.authSession.deleteMany();
      await context.prisma.adminLoginThrottle.deleteMany();
      await context.prisma.adminUser.deleteMany();
    });

    void afterEach(async () => {
      const cleanup = contexts.find((context) => context.app !== undefined);
      if (cleanup !== undefined) {
        await cleanup.prisma.authSession.deleteMany();
        await cleanup.prisma.adminLoginThrottle.deleteMany();
        await cleanup.prisma.adminUser.deleteMany();
        await cleanup.prisma.role.deleteMany({ where: { code: { startsWith: 'TEST_' } } });
      }
      while (contexts.length > 0) await contexts.pop()?.app.close();
    });

    void test('returns safe current identity/authorization and the same no-store CSRF token', async () => {
      const context = contexts[0];
      assert.ok(context);
      const admin = await createAdmin(context);
      const permission = await context.prisma.permission.findUniqueOrThrow({
        where: { code: 'admin.access' },
      });
      const extraRole = await context.prisma.role.create({
        data: {
          code: 'TEST_AUDITOR',
          permissions: { create: { permissionId: permission.id } },
          adminUsers: { create: { adminUserId: admin.id } },
        },
      });
      assert.equal(extraRole.code, 'TEST_AUDITOR');
      const loginResponse = await login(context, admin);
      const cookies = responseCookies(loginResponse.headers);
      const access = cookiePair(cookies, ACCESS_COOKIE_NAME);
      const refresh = cookiePair(cookies, REFRESH_COOKIE_NAME);

      const me = await request(server(context.app))
        .get('/api/v1/auth/me')
        .set('Cookie', access)
        .expect(200)
        .expect('Cache-Control', 'no-store');
      assert.deepEqual(me.body, {
        admin: {
          id: admin.id,
          email: admin.email,
          displayName: 'Protected Integration Admin',
        },
        authorization: {
          roles: ['SUPER_ADMIN', 'TEST_AUDITOR'],
          permissions: ['admin.access'],
        },
      });
      assert.doesNotMatch(JSON.stringify(me.body), /token|session|password/iu);

      const csrf = await request(server(context.app))
        .get('/api/v1/auth/csrf')
        .set('Cookie', refresh)
        .expect(200)
        .expect('Cache-Control', 'no-store');
      const loginBody = loginResponse.body as unknown as { csrfToken: string };
      assert.deepEqual(csrf.body, { csrfToken: loginBody.csrfToken });
      assert.equal(csrf.headers['set-cookie'], undefined);
    });

    void test('enforces current disabled, permission, and revoked-session state before JWT expiry', async () => {
      const context = contexts[0];
      assert.ok(context);
      const admin = await createAdmin(context);
      const loginResponse = await login(context, admin);
      const cookies = responseCookies(loginResponse.headers);
      const access = cookiePair(cookies, ACCESS_COOKIE_NAME);
      const refresh = cookiePair(cookies, REFRESH_COOKIE_NAME);
      const session = await context.prisma.authSession.findFirstOrThrow({
        where: { adminUserId: admin.id },
      });

      await context.prisma.adminUser.update({
        where: { id: admin.id },
        data: { disabledAt: new Date() },
      });
      for (const [path, cookie] of [
        ['/api/v1/auth/me', access],
        ['/api/v1/auth/csrf', refresh],
      ] as const) {
        const response: Response = await request(server(context.app))
          .get(path)
          .set('Cookie', cookie)
          .expect(401);
        assert.equal((response.body as { code: string }).code, 'ACCOUNT_DISABLED');
      }

      await context.prisma.adminUser.update({
        where: { id: admin.id },
        data: { disabledAt: null, roles: { deleteMany: {} } },
      });
      for (const [path, cookie] of [
        ['/api/v1/auth/me', access],
        ['/api/v1/auth/csrf', refresh],
      ] as const) {
        const response: Response = await request(server(context.app))
          .get(path)
          .set('Cookie', cookie)
          .expect(403);
        assert.equal((response.body as { code: string }).code, 'INSUFFICIENT_PERMISSION');
      }

      const role = await context.prisma.role.findUniqueOrThrow({ where: { code: 'SUPER_ADMIN' } });
      await context.prisma.adminUserRole.create({
        data: { adminUserId: admin.id, roleId: role.id },
      });
      await context.prisma.authSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
      for (const [path, cookie] of [
        ['/api/v1/auth/me', access],
        ['/api/v1/auth/csrf', refresh],
      ] as const) {
        const response: Response = await request(server(context.app))
          .get(path)
          .set('Cookie', cookie)
          .expect(401);
        assert.equal((response.body as { code: string }).code, 'AUTHENTICATION_REQUIRED');
      }
    });

    void test('rejects missing, expired, malformed, and untrusted Access JWTs with stable codes', async () => {
      const context = contexts[0];
      assert.ok(context);
      const admin = await createAdmin(context);
      const loginResponse = await login(context, admin);
      const access = cookiePair(responseCookies(loginResponse.headers), ACCESS_COOKIE_NAME);
      const session = await context.prisma.authSession.findFirstOrThrow({
        where: { adminUserId: admin.id },
      });

      const missing = await request(server(context.app))
        .get('/api/v1/auth/me')
        .expect(401)
        .expect('Cache-Control', 'no-store');
      assert.equal((missing.body as { code: string }).code, 'AUTHENTICATION_REQUIRED');

      const expired = await signAccess(context.environment, admin.id, session.id, {
        issuedAt: Math.floor(Date.now() / 1000) - 901,
      });
      const expiredResponse = await request(server(context.app))
        .get('/api/v1/auth/me')
        .set('Cookie', `${ACCESS_COOKIE_NAME}=${expired}`)
        .expect(401);
      assert.equal((expiredResponse.body as { code: string }).code, 'ACCESS_TOKEN_EXPIRED');

      const issuedAt = Math.floor(Date.now() / 1000);
      const incomplete = await new SignJWT({ sid: session.id })
        .setProtectedHeader({ alg: 'EdDSA', typ: 'at+jwt', kid: 'test-key' })
        .setSubject(admin.id)
        .setIssuer(context.environment.authentication.jwtIssuer)
        .setAudience(context.environment.authentication.jwtAudience)
        .setIssuedAt(issuedAt)
        .setExpirationTime(issuedAt + context.environment.authentication.accessTokenTtlSeconds)
        .sign(context.environment.authentication.jwtPrivateKey);
      const wrongAlgorithm = await new SignJWT({ sid: session.id })
        .setProtectedHeader({ alg: 'HS256', typ: 'at+jwt', kid: 'test-key' })
        .setSubject(admin.id)
        .setIssuer(context.environment.authentication.jwtIssuer)
        .setAudience(context.environment.authentication.jwtAudience)
        .setJti(randomUUID())
        .setIssuedAt(issuedAt)
        .setExpirationTime(issuedAt + context.environment.authentication.accessTokenTtlSeconds)
        .sign(randomBytes(32));
      const adversarial = [
        incomplete,
        wrongAlgorithm,
        await signAccess(context.environment, admin.id, session.id, { kid: 'unknown-key' }),
        await signAccess(context.environment, admin.id, session.id, { typ: 'JWT' }),
        await signAccess(context.environment, admin.id, session.id, {
          issuer: 'https://untrusted.example',
        }),
        await signAccess(context.environment, admin.id, session.id, {
          audience: 'untrusted-audience',
        }),
        await signAccess(context.environment, admin.id, session.id, {
          audience: [context.environment.authentication.jwtAudience, 'untrusted-audience'],
        }),
        await signAccess(context.environment, admin.id, session.id, {
          extraHeader: { jku: 'https://untrusted.example/jwks.json' },
        }),
        await signAccess(context.environment, admin.id, session.id, {
          extraPayload: { roles: ['SUPER_ADMIN'] },
        }),
        await signAccess(context.environment, admin.id, session.id, {
          issuedAt: issuedAt + 60,
        }),
        await signAccess(context.environment, randomUUID(), session.id),
        await signAccess(context.environment, admin.id, randomUUID()),
        `${access.slice(access.indexOf('=') + 1, -1)}x`,
      ];
      for (const token of adversarial) {
        const response: Response = await request(server(context.app))
          .get('/api/v1/auth/me')
          .set('Cookie', `${ACCESS_COOKIE_NAME}=${token}`)
          .expect(401);
        assert.equal((response.body as { code: string }).code, 'INVALID_ACCESS_TOKEN');
        assert.doesNotMatch(
          JSON.stringify(response.body as unknown),
          /untrusted|jku|signature|jwt/iu,
        );
      }
      const duplicate = await request(server(context.app))
        .get('/api/v1/auth/me')
        .set('Cookie', `${access}; ${access}`)
        .expect(401);
      assert.equal((duplicate.body as { code: string }).code, 'INVALID_ACCESS_TOKEN');
    });

    void test('classifies invalid/expired Refresh credentials and recovers across CSRF key rotation', async () => {
      const base = contexts[0];
      assert.ok(base);
      await base.app.close();
      contexts.pop();
      const oldKey = randomBytes(32).toString('base64');
      const newKey = randomBytes(32).toString('base64');
      const ring = JSON.stringify({ old: oldKey, current: newKey });
      const oldContext = await startContext({
        AUTH_CSRF_ACTIVE_KID: 'old',
        AUTH_CSRF_HMAC_KEYS: ring,
      });
      contexts.push(oldContext);
      const admin = await createAdmin(oldContext);
      const loginResponse = await login(oldContext, admin);
      const refresh = cookiePair(responseCookies(loginResponse.headers), REFRESH_COOKIE_NAME);

      const invalid = await request(server(oldContext.app))
        .get('/api/v1/auth/csrf')
        .set('Cookie', `${REFRESH_COOKIE_NAME}=${randomBytes(32).toString('base64url')}`)
        .expect(401);
      assert.equal((invalid.body as { code: string }).code, 'REFRESH_TOKEN_INVALID');

      const oldCredentials = await oldContext.crypto.issueLoginCredentials(
        admin.id,
        new Date(Date.now() - 8 * 86_400_000),
      );
      await oldContext.repository.commitSuccessfulLogin(
        admin.id,
        oldContext.crypto.identifierKey(`expired-${randomUUID()}@example.invalid`),
        oldCredentials,
        null,
        new Date(Date.now() - 8 * 86_400_000),
      );
      const expired = await request(server(oldContext.app))
        .get('/api/v1/auth/csrf')
        .set('Cookie', `${REFRESH_COOKIE_NAME}=${oldCredentials.refreshToken}`)
        .expect(401);
      assert.equal((expired.body as { code: string }).code, 'REFRESH_TOKEN_EXPIRED');

      await oldContext.app.close();
      contexts.pop();
      const rotatedContext = await startContext({
        AUTH_CSRF_ACTIVE_KID: 'current',
        AUTH_CSRF_HMAC_KEYS: ring,
      });
      contexts.push(rotatedContext);
      const recovered = await request(server(rotatedContext.app))
        .get('/api/v1/auth/csrf')
        .set('Cookie', refresh)
        .expect(200);
      const loginBody = loginResponse.body as unknown as { csrfToken: string };
      assert.deepEqual(recovered.body, { csrfToken: loginBody.csrfToken });
    });

    void test('documents both cookie-authenticated endpoints without credential examples', async () => {
      const context = contexts[0];
      assert.ok(context);
      const response = await request(server(context.app)).get('/api/docs-json').expect(200);
      const document = response.body as {
        components: { securitySchemes: Record<string, unknown> };
        paths: Record<
          string,
          { get?: { responses?: Record<string, unknown>; security?: unknown } }
        >;
      };
      assert.deepEqual(document.components.securitySchemes, {
        adminAccess: { type: 'apiKey', in: 'cookie', name: ACCESS_COOKIE_NAME },
        adminRefresh: { type: 'apiKey', in: 'cookie', name: REFRESH_COOKIE_NAME },
      });
      for (const path of ['/api/v1/auth/csrf', '/api/v1/auth/me']) {
        const operation = document.paths[path]?.get;
        assert.ok(operation);
        assert.deepEqual(Object.keys(operation.responses ?? {}).sort(), [
          '200',
          '401',
          '403',
          '500',
        ]);
        assert.ok(operation.security);
        assert.doesNotMatch(JSON.stringify(operation), /admin_(?:access|refresh)_token=/u);
      }
    });
  },
);
