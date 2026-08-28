import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, test } from 'node:test';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import type { Response } from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/application';
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
} from '../src/authentication/authentication.constants';
import { AuthenticationRepository } from '../src/authentication/authentication.repository';
import type { ApiEnvironment, RuntimeEnvironment } from '../src/config/environment';
import { PrismaService } from '../src/database/prisma.service';
import { createTestEnvironment } from './test-environment';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const allowedOrigin = 'http://localhost:3001';

interface Context {
  app: INestApplication;
  environment: ApiEnvironment;
  prisma: PrismaService;
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

function cookieValue(cookie: string): string {
  return cookie.slice(cookie.indexOf('=') + 1);
}

function hash(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(createHash('sha256').update(value, 'utf8').digest());
}

async function startContext(nodeEnv: RuntimeEnvironment = 'test'): Promise<Context> {
  assert.ok(testDatabaseUrl);
  const environment = createTestEnvironment(nodeEnv, { DATABASE_URL: testDatabaseUrl });
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
    repository: moduleRef.get(AuthenticationRepository),
  };
}

async function createAdmin(context: Context): Promise<AdminCredential> {
  const role = await context.prisma.role.findUniqueOrThrow({ where: { code: 'SUPER_ADMIN' } });
  const password = randomBytes(32).toString('base64url');
  const admin = await context.prisma.adminUser.create({
    data: {
      email: `logout-${randomUUID()}@example.invalid`,
      displayName: 'Logout Integration Admin',
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

async function login(context: Context, admin: AdminCredential): Promise<Response> {
  return request(server(context.app))
    .post('/api/v1/auth/login')
    .set('Origin', allowedOrigin)
    .set('Sec-Fetch-Site', 'same-origin')
    .send({ email: admin.email, password: admin.password })
    .expect(200);
}

function logoutRequest(context: Context, refreshCookie: string, csrfToken: string) {
  return request(server(context.app))
    .post('/api/v1/auth/logout')
    .set('Origin', allowedOrigin)
    .set('Sec-Fetch-Site', 'same-origin')
    .set('X-CSRF-Token', csrfToken)
    .set('Cookie', refreshCookie);
}

function refreshRequest(context: Context, refreshCookie: string, csrfToken: string) {
  return request(server(context.app))
    .post('/api/v1/auth/refresh')
    .set('Origin', allowedOrigin)
    .set('Sec-Fetch-Site', 'same-origin')
    .set('X-CSRF-Token', csrfToken)
    .set('Cookie', refreshCookie);
}

void describe(
  'current-session logout and disabled Admin PostgreSQL/HTTP contract',
  { skip: testDatabaseUrl === undefined, concurrency: 1 },
  () => {
    const contexts: Context[] = [];
    let context: Context;

    void beforeEach(async () => {
      context = await startContext();
      contexts.push(context);
      await context.prisma.authSession.deleteMany();
      await context.prisma.adminLoginThrottle.deleteMany();
      await context.prisma.adminUser.deleteMany();
    });

    void afterEach(async () => {
      if (contexts.length > 0) {
        await contexts[0]?.prisma.authSession.deleteMany();
        await contexts[0]?.prisma.adminLoginThrottle.deleteMany();
        await contexts[0]?.prisma.adminUser.deleteMany();
      }
      while (contexts.length > 0) await contexts.pop()?.app.close();
    });

    void test('logs out a stale known family token and leaves another Admin session usable', async () => {
      const admin = await createAdmin(context);
      const firstLogin = await login(context, admin);
      const secondLogin = await login(context, admin);
      const firstCookies = responseCookies(firstLogin.headers);
      const secondCookies = responseCookies(secondLogin.headers);
      const firstOldRefresh = cookiePair(firstCookies, REFRESH_COOKIE_NAME);
      const firstCsrf = (firstLogin.body as { csrfToken: string }).csrfToken;
      const secondAccess = cookiePair(secondCookies, ACCESS_COOKIE_NAME);
      const secondRefresh = cookiePair(secondCookies, REFRESH_COOKIE_NAME);

      await refreshRequest(context, firstOldRefresh, firstCsrf).expect(204);
      const affectedToken = await context.prisma.refreshToken.findUniqueOrThrow({
        where: { tokenHash: hash(cookieValue(firstOldRefresh)) },
      });
      const logout = await logoutRequest(context, firstOldRefresh, firstCsrf)
        .expect(204)
        .expect('Cache-Control', 'no-store');
      assert.equal(logout.text, '');
      const cleared = responseCookies(logout.headers);
      assert.deepEqual(cleared, [
        `${ACCESS_COOKIE_NAME}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax`,
        `${REFRESH_COOKIE_NAME}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax`,
      ]);

      const affectedSession = await context.prisma.authSession.findUniqueOrThrow({
        where: { id: affectedToken.sessionId },
        include: { refreshTokens: true },
      });
      assert.ok(affectedSession.revokedAt);
      assert.ok(affectedSession.refreshTokens.every((token) => token.revokedAt !== null));
      assert.ok(
        affectedSession.refreshTokens.every(
          (token) =>
            token.recoveryCiphertext === null &&
            token.recoveryNonce === null &&
            token.recoveryAuthTag === null &&
            token.recoveryKeyId === null &&
            token.recoveryExpiresAt === null,
        ),
      );

      await request(server(context.app))
        .get('/api/v1/auth/me')
        .set('Cookie', secondAccess)
        .expect(200);
      await request(server(context.app))
        .get('/api/v1/auth/csrf')
        .set('Cookie', secondRefresh)
        .expect(200);
    });

    void test('makes concurrent and repeated logout idempotent for expired/revoked known state', async () => {
      const admin = await createAdmin(context);
      const loginResponse = await login(context, admin);
      const refreshCookie = cookiePair(responseCookies(loginResponse.headers), REFRESH_COOKIE_NAME);
      const csrfToken = (loginResponse.body as { csrfToken: string }).csrfToken;
      const token = await context.prisma.refreshToken.findUniqueOrThrow({
        where: { tokenHash: hash(cookieValue(refreshCookie)) },
      });
      await context.prisma.refreshToken.update({
        where: { id: token.id },
        data: {
          createdAt: new Date(Date.now() - 2_000),
          expiresAt: new Date(Date.now() - 1_000),
        },
      });

      const [first, second] = await Promise.all([
        logoutRequest(context, refreshCookie, csrfToken),
        logoutRequest(context, refreshCookie, csrfToken),
      ]);
      assert.equal(first.status, 204);
      assert.equal(second.status, 204);
      assert.deepEqual(responseCookies(first.headers), responseCookies(second.headers));
      const afterConcurrent = await context.prisma.authSession.findUniqueOrThrow({
        where: { id: token.sessionId },
        include: { refreshTokens: true },
      });
      assert.ok(afterConcurrent.revokedAt);
      const sessionRevokedAt = afterConcurrent.revokedAt.getTime();
      const tokenRevokedAt = afterConcurrent.refreshTokens[0]?.revokedAt?.getTime();
      assert.ok(tokenRevokedAt);

      await logoutRequest(context, refreshCookie, csrfToken).expect(204);
      const repeated = await context.prisma.authSession.findUniqueOrThrow({
        where: { id: token.sessionId },
        include: { refreshTokens: true },
      });
      assert.equal(repeated.revokedAt?.getTime(), sessionRevokedAt);
      assert.equal(repeated.refreshTokens[0]?.revokedAt?.getTime(), tokenRevokedAt);
    });

    void test('rejects every disabled Admin session but still permits known-session cleanup', async () => {
      const admin = await createAdmin(context);
      const firstLogin = await login(context, admin);
      const secondLogin = await login(context, admin);
      const sessions = [firstLogin, secondLogin].map((response) => {
        const cookies = responseCookies(response.headers);
        return {
          access: cookiePair(cookies, ACCESS_COOKIE_NAME),
          refresh: cookiePair(cookies, REFRESH_COOKIE_NAME),
          csrf: (response.body as { csrfToken: string }).csrfToken,
        };
      });
      await context.prisma.adminUser.update({
        where: { id: admin.id },
        data: { disabledAt: new Date() },
      });

      for (const session of sessions) {
        const me = await request(server(context.app))
          .get('/api/v1/auth/me')
          .set('Cookie', session.access)
          .expect(401);
        assert.equal((me.body as { code: string }).code, 'ACCOUNT_DISABLED');
        const csrf = await request(server(context.app))
          .get('/api/v1/auth/csrf')
          .set('Cookie', session.refresh)
          .expect(401);
        assert.equal((csrf.body as { code: string }).code, 'ACCOUNT_DISABLED');
        const refresh = await refreshRequest(context, session.refresh, session.csrf).expect(401);
        assert.equal((refresh.body as { code: string }).code, 'ACCOUNT_DISABLED');
      }

      const first = sessions[0];
      const second = sessions[1];
      assert.ok(first);
      assert.ok(second);
      await logoutRequest(context, first.refresh, first.csrf).expect(204);
      const firstToken = await context.prisma.refreshToken.findUniqueOrThrow({
        where: { tokenHash: hash(cookieValue(first.refresh)) },
      });
      const secondToken = await context.prisma.refreshToken.findUniqueOrThrow({
        where: { tokenHash: hash(cookieValue(second.refresh)) },
      });
      assert.ok(
        (
          await context.prisma.authSession.findUniqueOrThrow({
            where: { id: firstToken.sessionId },
          })
        ).revokedAt,
      );
      assert.equal(
        (
          await context.prisma.authSession.findUniqueOrThrow({
            where: { id: secondToken.sessionId },
          })
        ).revokedAt,
        null,
      );

      await context.prisma.adminUser.update({
        where: { id: admin.id },
        data: { disabledAt: null },
      });
      await request(server(context.app))
        .get('/api/v1/auth/me')
        .set('Cookie', second.access)
        .expect(200);
    });

    void test('rejects unknown authentication and invalid CSRF without clearing cookies or state', async () => {
      const admin = await createAdmin(context);
      const loginResponse = await login(context, admin);
      const refreshCookie = cookiePair(responseCookies(loginResponse.headers), REFRESH_COOKIE_NAME);
      const csrfToken = (loginResponse.body as { csrfToken: string }).csrfToken;

      const missingOrigin = await request(server(context.app))
        .post('/api/v1/auth/logout')
        .set('X-CSRF-Token', csrfToken)
        .set('Cookie', refreshCookie)
        .expect(403);
      assert.equal((missingOrigin.body as { code: string }).code, 'CSRF_VALIDATION_FAILED');
      assert.equal(missingOrigin.headers['set-cookie'], undefined);
      const wrongCsrf = await logoutRequest(
        context,
        refreshCookie,
        randomBytes(32).toString('base64url'),
      ).expect(403);
      assert.equal((wrongCsrf.body as { code: string }).code, 'CSRF_VALIDATION_FAILED');
      assert.equal(wrongCsrf.headers['set-cookie'], undefined);
      const unknown = await logoutRequest(
        context,
        `${REFRESH_COOKIE_NAME}=${randomBytes(32).toString('base64url')}`,
        csrfToken,
      ).expect(401);
      assert.equal((unknown.body as { code: string }).code, 'REFRESH_TOKEN_INVALID');
      assert.equal(unknown.headers['set-cookie'], undefined);
      const missing = await request(server(context.app))
        .post('/api/v1/auth/logout')
        .set('Origin', allowedOrigin)
        .set('X-CSRF-Token', csrfToken)
        .expect(401);
      assert.equal((missing.body as { code: string }).code, 'AUTHENTICATION_REQUIRED');
      const duplicate = await request(server(context.app))
        .post('/api/v1/auth/logout')
        .set('Origin', allowedOrigin)
        .set('X-CSRF-Token', csrfToken)
        .set('Cookie', `${refreshCookie}; ${refreshCookie}`)
        .expect(401);
      assert.equal((duplicate.body as { code: string }).code, 'REFRESH_TOKEN_INVALID');

      const token = await context.prisma.refreshToken.findUniqueOrThrow({
        where: { tokenHash: hash(cookieValue(refreshCookie)) },
        select: { sessionId: true },
      });
      assert.equal(
        (await context.prisma.authSession.findUniqueOrThrow({ where: { id: token.sessionId } }))
          .revokedAt,
        null,
      );
    });

    void test('does not clear cookies or claim success when revocation persistence fails', async () => {
      const admin = await createAdmin(context);
      const loginResponse = await login(context, admin);
      const refreshCookie = cookiePair(responseCookies(loginResponse.headers), REFRESH_COOKIE_NAME);
      const csrfToken = (loginResponse.body as { csrfToken: string }).csrfToken;
      const originalLogout = context.repository.logoutKnownSession.bind(context.repository);
      context.repository.logoutKnownSession = () =>
        Promise.reject(new Error('database unavailable'));
      try {
        const failed = await logoutRequest(context, refreshCookie, csrfToken).expect(500);
        assert.equal((failed.body as { code: string }).code, 'INTERNAL_SERVER_ERROR');
        assert.equal(failed.headers['set-cookie'], undefined);
      } finally {
        context.repository.logoutKnownSession = originalLogout;
      }
      const token = await context.prisma.refreshToken.findUniqueOrThrow({
        where: { tokenHash: hash(cookieValue(refreshCookie)) },
        select: { sessionId: true },
      });
      assert.equal(
        (await context.prisma.authSession.findUniqueOrThrow({ where: { id: token.sessionId } }))
          .revokedAt,
        null,
      );
    });

    void test('uses Secure clearing cookies in production and publishes exact secret-free OpenAPI', async () => {
      const documentResponse = await request(server(context.app)).get('/api/docs-json').expect(200);
      const document = documentResponse.body as {
        paths: Record<string, Record<string, unknown>>;
      };
      const operation = document.paths['/api/v1/auth/logout']?.post as
        | {
            parameters?: { name?: string; in?: string; required?: boolean }[];
            requestBody?: unknown;
            responses?: Record<string, unknown>;
            security?: Record<string, unknown>[];
          }
        | undefined;
      assert.ok(operation);
      assert.equal(operation.requestBody, undefined);
      assert.deepEqual(Object.keys(operation.responses ?? {}).sort(), ['204', '401', '403', '500']);
      assert.ok(
        operation.parameters?.some(
          (parameter) =>
            parameter.name === 'X-CSRF-Token' &&
            parameter.in === 'header' &&
            parameter.required === true,
        ),
      );
      assert.deepEqual(operation.security, [{ adminRefresh: [] }]);
      assert.doesNotMatch(JSON.stringify(operation), /[A-Za-z0-9_-]{43}/u);

      await context.prisma.authSession.deleteMany();
      await context.prisma.adminUser.deleteMany();
      const production = await startContext('production');
      contexts.push(production);
      const admin = await createAdmin(production);
      const loginResponse = await login(production, admin);
      const refreshCookie = cookiePair(responseCookies(loginResponse.headers), REFRESH_COOKIE_NAME);
      const csrfToken = (loginResponse.body as { csrfToken: string }).csrfToken;
      const logout = await logoutRequest(production, refreshCookie, csrfToken).expect(204);
      const cookies = responseCookies(logout.headers);
      assert.equal(cookies.length, 2);
      assert.ok(cookies.every((cookie) => cookie.includes('; Secure')));
      assert.ok(cookies.every((cookie) => cookie.includes('; Max-Age=0;')));
    });
  },
);
