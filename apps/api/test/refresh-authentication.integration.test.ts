import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
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
import { AuthenticationCrypto } from '../src/authentication/authentication.crypto';
import { LoginSecurity } from '../src/authentication/login-security';
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
  };
}

async function createAdmin(context: Context): Promise<AdminCredential> {
  const role = await context.prisma.role.findUniqueOrThrow({ where: { code: 'SUPER_ADMIN' } });
  const password = '654321';
  const admin = await context.prisma.adminUser.create({
    data: {
      email: `refresh-${randomUUID()}@example.invalid`,
      username: `u_${randomUUID().replaceAll('-', '').slice(0, 18)}`,
      displayName: 'Refresh Integration Admin',
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
    .send({ identifier: admin.email, password: admin.password })
    .expect(200);
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
  'refresh rotation, recovery, and reuse PostgreSQL/HTTP contract',
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

    void test('rotates atomically and recovers the exact latest credential without another rotation', async () => {
      const admin = await createAdmin(context);
      const loginResponse = await login(context, admin);
      const loginCookies = responseCookies(loginResponse.headers);
      const oldRefresh = cookiePair(loginCookies, REFRESH_COOKIE_NAME);
      const csrfToken = (loginResponse.body as { csrfToken: string }).csrfToken;
      const initialSession = await context.prisma.authSession.findFirstOrThrow({
        where: { adminUserId: admin.id },
      });

      const rotated = await refreshRequest(context, oldRefresh, csrfToken)
        .expect(204)
        .expect('Cache-Control', 'no-store');
      assert.equal(rotated.text, '');
      const rotatedCookies = responseCookies(rotated.headers);
      assert.equal(rotatedCookies.length, 2);
      const newRefresh = cookiePair(rotatedCookies, REFRESH_COOKIE_NAME);
      assert.notEqual(newRefresh, oldRefresh);
      assert.ok(rotatedCookies.some((cookie) => cookie.startsWith(`${ACCESS_COOKIE_NAME}=`)));
      for (const cookie of rotatedCookies) {
        assert.match(cookie, /; Path=\/;/u);
        assert.match(cookie, /; HttpOnly;/u);
        assert.match(cookie, /; SameSite=Lax/u);
        assert.doesNotMatch(cookie, /; Domain=/iu);
      }

      const tokens = await context.prisma.refreshToken.findMany({
        where: { sessionId: initialSession.id },
        orderBy: { createdAt: 'asc' },
      });
      assert.equal(tokens.length, 2);
      const first = tokens[0];
      const latest = tokens[1];
      assert.ok(first);
      assert.ok(latest);
      assert.ok(first.rotatedAt);
      assert.equal(first.replacedByTokenId, latest.id);
      assert.equal(latest.rotatedAt, null);
      assert.deepEqual(Buffer.from(latest.tokenHash), Buffer.from(hash(cookieValue(newRefresh))));
      assert.equal(latest.expiresAt.getTime(), initialSession.expiresAt.getTime());
      assert.equal(latest.recoveryNonce?.byteLength, 12);
      assert.equal(latest.recoveryAuthTag?.byteLength, 16);
      assert.ok(latest.recoveryCiphertext);
      assert.doesNotMatch(
        Buffer.from(latest.recoveryCiphertext).toString('utf8'),
        /[A-Za-z0-9_-]{43}/u,
      );

      const recovered = await refreshRequest(context, oldRefresh, csrfToken).expect(204);
      const recoveredRefresh = cookiePair(responseCookies(recovered.headers), REFRESH_COOKIE_NAME);
      assert.equal(recoveredRefresh, newRefresh);
      assert.equal(
        await context.prisma.refreshToken.count({ where: { sessionId: initialSession.id } }),
        2,
      );
    });

    void test('serializes concurrent same-token refreshes into one rotation and one recovery', async () => {
      const admin = await createAdmin(context);
      const loginResponse = await login(context, admin);
      const oldRefresh = cookiePair(responseCookies(loginResponse.headers), REFRESH_COOKIE_NAME);
      const csrfToken = (loginResponse.body as { csrfToken: string }).csrfToken;

      const [first, second] = await Promise.all([
        refreshRequest(context, oldRefresh, csrfToken),
        refreshRequest(context, oldRefresh, csrfToken),
      ]);
      assert.equal(first.status, 204);
      assert.equal(second.status, 204);
      const firstRefresh = cookiePair(responseCookies(first.headers), REFRESH_COOKIE_NAME);
      const secondRefresh = cookiePair(responseCookies(second.headers), REFRESH_COOKIE_NAME);
      assert.equal(firstRefresh, secondRefresh);
      const session = await context.prisma.authSession.findFirstOrThrow({
        where: { adminUserId: admin.id },
      });
      assert.equal(
        await context.prisma.refreshToken.count({ where: { sessionId: session.id } }),
        2,
      );
      assert.equal(
        await context.prisma.refreshToken.count({
          where: { sessionId: session.id, rotatedAt: null, revokedAt: null },
        }),
        1,
      );
    });

    void test('rolls back every refresh mutation when replacement persistence fails', async () => {
      const admin = await createAdmin(context);
      const loginResponse = await login(context, admin);
      const oldRefresh = cookiePair(responseCookies(loginResponse.headers), REFRESH_COOKIE_NAME);
      const csrfToken = (loginResponse.body as { csrfToken: string }).csrfToken;
      const originalIssue = context.crypto.issueRefreshCredentials.bind(context.crypto);
      context.crypto.issueRefreshCredentials = async (adminId, sessionId, expiresAt, now) => ({
        ...(await originalIssue(adminId, sessionId, expiresAt, now)),
        refreshTokenHash: hash(cookieValue(oldRefresh)),
      });
      try {
        const failed = await refreshRequest(context, oldRefresh, csrfToken).expect(500);
        assert.equal((failed.body as { code: string }).code, 'INTERNAL_SERVER_ERROR');
        assert.equal(failed.headers['set-cookie'], undefined);
      } finally {
        context.crypto.issueRefreshCredentials = originalIssue;
      }
      const session = await context.prisma.authSession.findFirstOrThrow({
        where: { adminUserId: admin.id },
        include: { refreshTokens: true, refreshThrottle: true },
      });
      assert.equal(session.refreshTokens.length, 1);
      assert.equal(session.refreshTokens[0]?.rotatedAt, null);
      assert.equal(session.refreshTokens[0]?.replacedByTokenId, null);
      assert.equal(session.refreshThrottle?.attemptCount, 0);
    });

    void test('classifies an advanced family as reuse and revokes only its affected session', async () => {
      const admin = await createAdmin(context);
      const firstLogin = await login(context, admin);
      const secondLogin = await login(context, admin);
      const firstOld = cookiePair(responseCookies(firstLogin.headers), REFRESH_COOKIE_NAME);
      const secondRefresh = cookiePair(responseCookies(secondLogin.headers), REFRESH_COOKIE_NAME);
      const firstCsrf = (firstLogin.body as { csrfToken: string }).csrfToken;

      const firstRotation = await refreshRequest(context, firstOld, firstCsrf).expect(204);
      const firstCurrent = cookiePair(responseCookies(firstRotation.headers), REFRESH_COOKIE_NAME);
      await refreshRequest(context, firstCurrent, firstCsrf).expect(204);
      const reused = await refreshRequest(context, firstOld, firstCsrf).expect(401);
      assert.equal((reused.body as { code: string }).code, 'REFRESH_TOKEN_REUSED');
      assert.equal(reused.headers['set-cookie'], undefined);

      const affected = await context.prisma.refreshToken.findUniqueOrThrow({
        where: { tokenHash: hash(cookieValue(firstOld)) },
      });
      const affectedSession = await context.prisma.authSession.findUniqueOrThrow({
        where: { id: affected.sessionId },
      });
      assert.ok(affectedSession.revokedAt);
      assert.equal(
        await context.prisma.refreshToken.count({
          where: { sessionId: affectedSession.id, revokedAt: null },
        }),
        0,
      );
      await request(server(context.app))
        .get('/api/v1/auth/csrf')
        .set('Cookie', secondRefresh)
        .expect(200);
    });

    void test('enforces current expiry, disabled Admin, permission, and revoked-session state', async () => {
      const admin = await createAdmin(context);
      const loginResponse = await login(context, admin);
      const refreshCookie = cookiePair(responseCookies(loginResponse.headers), REFRESH_COOKIE_NAME);
      const csrfToken = (loginResponse.body as { csrfToken: string }).csrfToken;
      const session = await context.prisma.authSession.findFirstOrThrow({
        where: { adminUserId: admin.id },
        include: { refreshTokens: true },
      });
      const refreshToken = session.refreshTokens[0];
      assert.ok(refreshToken);

      await context.prisma.refreshToken.update({
        where: { id: refreshToken.id },
        data: {
          createdAt: new Date(Date.now() - 2_000),
          expiresAt: new Date(Date.now() - 1_000),
        },
      });
      const expired = await refreshRequest(context, refreshCookie, csrfToken).expect(401);
      assert.equal((expired.body as { code: string }).code, 'REFRESH_TOKEN_EXPIRED');
      await context.prisma.refreshToken.update({
        where: { id: refreshToken.id },
        data: { createdAt: refreshToken.createdAt, expiresAt: session.expiresAt },
      });

      await context.prisma.adminUser.update({
        where: { id: admin.id },
        data: { disabledAt: new Date() },
      });
      const disabled = await refreshRequest(context, refreshCookie, csrfToken).expect(401);
      assert.equal((disabled.body as { code: string }).code, 'ACCOUNT_DISABLED');
      await context.prisma.adminUser.update({
        where: { id: admin.id },
        data: { disabledAt: null, roles: { deleteMany: {} } },
      });
      const forbidden = await refreshRequest(context, refreshCookie, csrfToken).expect(403);
      assert.equal((forbidden.body as { code: string }).code, 'INSUFFICIENT_PERMISSION');

      const role = await context.prisma.role.findUniqueOrThrow({ where: { code: 'SUPER_ADMIN' } });
      await context.prisma.adminUserRole.create({
        data: { adminUserId: admin.id, roleId: role.id },
      });
      await context.prisma.authSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
      const revoked = await refreshRequest(context, refreshCookie, csrfToken).expect(401);
      assert.equal((revoked.body as { code: string }).code, 'AUTHENTICATION_REQUIRED');
    });

    void test('fails tampered recovery closed as reuse and enforces CSRF and both throttle layers', async () => {
      const admin = await createAdmin(context);
      const loginResponse = await login(context, admin);
      const oldRefresh = cookiePair(responseCookies(loginResponse.headers), REFRESH_COOKIE_NAME);
      const csrfToken = (loginResponse.body as { csrfToken: string }).csrfToken;

      const missingOrigin = await request(server(context.app))
        .post('/api/v1/auth/refresh')
        .set('X-CSRF-Token', csrfToken)
        .set('Cookie', oldRefresh)
        .expect(403);
      assert.equal((missingOrigin.body as { code: string }).code, 'CSRF_VALIDATION_FAILED');
      const missingCsrf = await request(server(context.app))
        .post('/api/v1/auth/refresh')
        .set('Origin', allowedOrigin)
        .set('Cookie', oldRefresh)
        .expect(403);
      assert.equal((missingCsrf.body as { code: string }).code, 'CSRF_VALIDATION_FAILED');

      await refreshRequest(context, oldRefresh, csrfToken).expect(204);
      const latest = await context.prisma.refreshToken.findFirstOrThrow({
        where: { rotatedAt: null },
      });
      const tamperedTag = Uint8Array.from(latest.recoveryAuthTag ?? []);
      tamperedTag[0] = (tamperedTag[0] ?? 0) ^ 1;
      await context.prisma.refreshToken.update({
        where: { id: latest.id },
        data: { recoveryAuthTag: tamperedTag },
      });
      const tampered = await refreshRequest(context, oldRefresh, csrfToken).expect(401);
      assert.equal((tampered.body as { code: string }).code, 'REFRESH_TOKEN_REUSED');

      await context.prisma.authSession.deleteMany();
      await context.prisma.adminUser.deleteMany();
      const limitedContext = await startContext({
        AUTH_REFRESH_SESSION_LIMIT_PER_MINUTE: '1',
        AUTH_REFRESH_IP_LIMIT_PER_MINUTE: '1',
      });
      contexts.push(limitedContext);
      const limitedAdmin = await createAdmin(limitedContext);
      const limitedFirst = await login(limitedContext, limitedAdmin);
      const limitedSecond = await login(limitedContext, limitedAdmin);
      const firstRefresh = cookiePair(responseCookies(limitedFirst.headers), REFRESH_COOKIE_NAME);
      const secondSessionRefresh = cookiePair(
        responseCookies(limitedSecond.headers),
        REFRESH_COOKIE_NAME,
      );
      const firstToken = (limitedFirst.body as { csrfToken: string }).csrfToken;
      const secondToken = (limitedSecond.body as { csrfToken: string }).csrfToken;
      await refreshRequest(limitedContext, firstRefresh, firstToken).expect(204);
      const ipLimited = await refreshRequest(
        limitedContext,
        secondSessionRefresh,
        secondToken,
      ).expect(429);
      assert.equal((ipLimited.body as { code: string }).code, 'AUTH_RATE_LIMITED');
      assert.ok(Number(ipLimited.headers['retry-after']) >= 1);

      limitedContext.app.get(LoginSecurity).resetForTests();
      const sessionLimited = await refreshRequest(limitedContext, firstRefresh, firstToken).expect(
        429,
      );
      assert.equal((sessionLimited.body as { code: string }).code, 'AUTH_RATE_LIMITED');
    });

    void test('publishes an exact secret-free OpenAPI refresh contract', async () => {
      const response = await request(server(context.app)).get('/api/docs-json').expect(200);
      const document = response.body as {
        paths: Record<string, Record<string, unknown>>;
      };
      const operation = document.paths['/api/v1/auth/refresh']?.post as
        | {
            parameters?: { name?: string; in?: string; required?: boolean }[];
            requestBody?: unknown;
            responses?: Record<string, unknown>;
            security?: Record<string, unknown>[];
          }
        | undefined;
      assert.ok(operation);
      assert.equal(operation.requestBody, undefined);
      assert.deepEqual(Object.keys(operation.responses ?? {}).sort(), [
        '204',
        '401',
        '403',
        '429',
        '500',
      ]);
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
    });
  },
);
