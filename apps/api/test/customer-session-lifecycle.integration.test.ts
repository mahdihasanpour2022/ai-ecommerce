import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, test } from 'node:test';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/application';
import {
  CUSTOMER_ACCESS_COOKIE_NAME,
  CUSTOMER_AUTH_FLOW_COOKIE_NAME,
  CUSTOMER_CSRF_COOKIE_NAME,
  CUSTOMER_REFRESH_COOKIE_NAME,
} from '../src/customer-authentication/customer-authentication.constants';
import { CustomerSessionCrypto } from '../src/customer-authentication/customer-session.crypto';
import {
  OTP_SENDER,
  type OtpSender,
  type SendOtpCommand,
  type SendOtpOutcome,
} from '../src/customer-authentication/otp-sender';
import { PrismaService } from '../src/database/prisma.service';
import { createTestEnvironment } from './test-environment';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const allowedOrigin = 'http://localhost:3001';

class FakeOtpSender implements OtpSender {
  readonly commands: SendOtpCommand[] = [];

  send(command: SendOtpCommand): Promise<SendOtpOutcome> {
    this.commands.push(command);
    return Promise.resolve({ status: 'ACCEPTED' });
  }
}

interface ErrorResponseBody {
  readonly code: string;
}

interface SingleResultEnvelope<T> {
  readonly singleResult: T;
}

interface CustomerSessionOpenApiDocument {
  readonly paths: Record<string, unknown>;
  readonly components: {
    readonly securitySchemes: Record<string, { readonly name: string }>;
  };
}

interface CustomerCookies {
  readonly access: string;
  readonly refresh: string;
  readonly csrf: string;
  readonly csrfValue: string;
}

function server(app: INestApplication): App {
  return app.getHttpServer() as App;
}

function responseCookies(headers: unknown): string[] {
  const value = (headers as Record<string, unknown>)['set-cookie'];
  if (
    !Array.isArray(value) ||
    !value.every((cookie): cookie is string => typeof cookie === 'string')
  ) {
    assert.fail('Expected string Set-Cookie headers.');
  }
  return value;
}

function responseBody<T>(response: { readonly body: unknown }): T {
  return response.body as T;
}

function cookiePair(cookies: readonly string[], name: string): string {
  const cookie = cookies.find((value) => value.startsWith(`${name}=`));
  assert.ok(cookie);
  return cookie.slice(0, cookie.indexOf(';'));
}

function cookieValue(cookie: string): string {
  return cookie.slice(cookie.indexOf('=') + 1);
}

void describe(
  'Customer session lifecycle PostgreSQL and HTTP contract',
  { skip: testDatabaseUrl === undefined, concurrency: 1 },
  () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let sender: FakeOtpSender;

    void beforeEach(async () => {
      sender = new FakeOtpSender();
      const environment = createTestEnvironment('test', { DATABASE_URL: testDatabaseUrl });
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule.forRoot(environment)],
      })
        .overrideProvider(OTP_SENDER)
        .useValue(sender)
        .compile();
      app = moduleRef.createNestApplication({ logger: false });
      configureApplication(app, environment);
      await app.init();
      prisma = moduleRef.get(PrismaService);
      await cleanup();
    });

    void afterEach(async () => {
      await cleanup();
      await app.close();
    });

    async function cleanup(): Promise<void> {
      await prisma.customerRegistrationGrant.deleteMany();
      await prisma.customerAuthSession.deleteMany();
      await prisma.customerOtpChallenge.deleteMany();
      await prisma.customerOtpMobileThrottle.deleteMany();
      await prisma.customer.deleteMany();
    }

    function sameOrigin<T extends { set(name: string, value: string): T }>(requestBuilder: T): T {
      return requestBuilder
        .set('Origin', allowedOrigin)
        .set('Sec-Fetch-Site', 'same-origin');
    }

    async function createCustomerSession(): Promise<CustomerCookies> {
      const requested = await sameOrigin(
        request(server(app)).post('/api/v1/customer-auth/otp/request'),
      )
        .send({ mobile: '09217101700' })
        .expect(200);
      const otpFlow = cookiePair(responseCookies(requested.headers), CUSTOMER_AUTH_FLOW_COOKIE_NAME);
      const command = sender.commands.at(-1);
      assert.ok(command);
      const verified = await sameOrigin(
        request(server(app)).post('/api/v1/customer-auth/otp/verify'),
      )
        .set('Cookie', otpFlow)
        .send({ code: command.code })
        .expect(200);
      const registrationFlow = cookiePair(
        responseCookies(verified.headers),
        CUSTOMER_AUTH_FLOW_COOKIE_NAME,
      );
      const registered = await sameOrigin(
        request(server(app)).post('/api/v1/customer-auth/register'),
      )
        .set('Cookie', registrationFlow)
        .send({ firstName: 'علی', lastName: 'احمدی' })
        .expect(200);
      const cookies = responseCookies(registered.headers);
      const csrf = cookiePair(cookies, CUSTOMER_CSRF_COOKIE_NAME);
      return {
        access: cookiePair(cookies, CUSTOMER_ACCESS_COOKIE_NAME),
        refresh: cookiePair(cookies, CUSTOMER_REFRESH_COOKIE_NAME),
        csrf,
        csrfValue: cookieValue(csrf),
      };
    }

    const bootstrap = (cookies: readonly string[]) =>
      sameOrigin(request(server(app)).post('/api/v1/customer-auth/bootstrap')).set(
        'Cookie',
        cookies.join('; '),
      );

    const refresh = (refreshCookie: string, csrf: string) =>
      sameOrigin(request(server(app)).post('/api/v1/customer-auth/refresh'))
        .set('Cookie', refreshCookie)
        .set('X-CSRF-Token', csrf);

    void test('bootstraps current identity without rotating a valid Access credential', async () => {
      const cookies = await createCustomerSession();
      const response = await bootstrap([cookies.access, cookies.refresh])
        .expect(200)
        .expect('Cache-Control', 'no-store');
      const body = responseBody<
        SingleResultEnvelope<{ readonly customer: unknown; readonly csrfToken: string }>
      >(response);
      assert.deepEqual(body.singleResult.customer, {
        id: (await prisma.customer.findFirstOrThrow()).id,
        mobile: '+989217101700',
        firstName: 'علی',
        lastName: 'احمدی',
      });
      assert.equal(body.singleResult.csrfToken, cookies.csrfValue);
      const issued = responseCookies(response.headers);
      assert.equal(issued.length, 1);
      assert.equal(cookiePair(issued, CUSTOMER_CSRF_COOKIE_NAME), cookies.csrf);
      assert.equal(await prisma.customerRefreshToken.count(), 1);
    });

    void test('recovers bootstrap through refresh when Access is unavailable', async () => {
      const cookies = await createCustomerSession();
      const response = await bootstrap([cookies.refresh]).expect(200);
      const issued = responseCookies(response.headers);
      assert.equal(issued.length, 3);
      assert.notEqual(cookiePair(issued, CUSTOMER_REFRESH_COOKIE_NAME), cookies.refresh);
      assert.equal(await prisma.customerRefreshToken.count(), 2);
      assert.equal(await prisma.customerRefreshToken.count({ where: { rotatedAt: { not: null } } }), 1);
    });

    void test('rotates once and recovers the same replacement for concurrent refresh requests', async () => {
      const cookies = await createCustomerSession();
      const responses = await Promise.all([
        refresh(cookies.refresh, cookies.csrfValue),
        refresh(cookies.refresh, cookies.csrfValue),
      ]);
      assert.ok(responses.every((response) => response.status === 200));
      const replacements = responses.map((response) =>
        cookiePair(responseCookies(response.headers), CUSTOMER_REFRESH_COOKIE_NAME),
      );
      assert.equal(replacements[0], replacements[1]);
      assert.equal(await prisma.customerRefreshToken.count(), 2);
      assert.equal((await prisma.customerAuthSession.findFirstOrThrow()).revokedAt, null);
    });

    void test('revokes the session when a rotated Refresh is reused after its grace window', async () => {
      const cookies = await createCustomerSession();
      await refresh(cookies.refresh, cookies.csrfValue).expect(200);
      const oldToken = await prisma.customerRefreshToken.findFirstOrThrow({
        where: { rotatedAt: { not: null } },
      });
      const outsideGrace = new Date(Date.now() - 61_000);
      await prisma.customerRefreshToken.update({
        where: { id: oldToken.id },
        data: {
          createdAt: new Date(outsideGrace.getTime() - 1_000),
          rotatedAt: outsideGrace,
        },
      });
      const response = await refresh(cookies.refresh, cookies.csrfValue).expect(401);
      assert.equal(responseBody<ErrorResponseBody>(response).code, 'REFRESH_TOKEN_REUSED');
      assert.ok((await prisma.customerAuthSession.findFirstOrThrow()).revokedAt);
      assert.equal(
        await prisma.customerRefreshToken.count({ where: { revokedAt: { not: null } } }),
        2,
      );
    });

    void test('rejects missing CSRF and cross-site refresh without rotating credentials', async () => {
      const cookies = await createCustomerSession();
      const missingCsrf = await sameOrigin(
        request(server(app)).post('/api/v1/customer-auth/refresh'),
      )
        .set('Cookie', cookies.refresh)
        .expect(403);
      assert.equal(responseBody<ErrorResponseBody>(missingCsrf).code, 'CSRF_VALIDATION_FAILED');
      const crossSite = await request(server(app))
        .post('/api/v1/customer-auth/refresh')
        .set('Origin', 'https://attacker.example')
        .set('Sec-Fetch-Site', 'cross-site')
        .set('Cookie', cookies.refresh)
        .set('X-CSRF-Token', cookies.csrfValue)
        .expect(403);
      assert.equal(responseBody<ErrorResponseBody>(crossSite).code, 'CSRF_VALIDATION_FAILED');
      assert.equal(await prisma.customerRefreshToken.count(), 1);
    });

    void test('rejects an unknown Refresh credential and clears customer cookies', async () => {
      const response = await refresh(
        `${CUSTOMER_REFRESH_COOKIE_NAME}=${'a'.repeat(43)}`,
        'b'.repeat(43),
      ).expect(401);
      assert.equal(responseBody<ErrorResponseBody>(response).code, 'REFRESH_TOKEN_INVALID');
      assert.ok(responseCookies(response.headers).every((cookie) => cookie.includes('Max-Age=0')));
    });

    void test('invalidates authentication when the current customer is disabled', async () => {
      const cookies = await createCustomerSession();
      await prisma.customer.updateMany({ data: { disabledAt: new Date() } });
      const response = await bootstrap([cookies.access, cookies.refresh]).expect(401);
      assert.equal(responseBody<ErrorResponseBody>(response).code, 'CUSTOMER_ACCOUNT_DISABLED');
      const expired = responseCookies(response.headers);
      assert.equal(expired.length, 3);
      assert.ok(expired.every((cookie) => cookie.includes('Max-Age=0')));
    });

    void test('rejects an absolutely expired customer session and clears its cookies', async () => {
      const cookies = await createCustomerSession();
      const expiresAt = new Date(Date.now() - 1_000);
      const createdAt = new Date(expiresAt.getTime() - 7 * 24 * 60 * 60_000);
      await prisma.customerAuthSession.updateMany({
        data: { createdAt, lastUsedAt: createdAt, expiresAt, updatedAt: new Date() },
      });
      const response = await bootstrap([cookies.access, cookies.refresh]).expect(401);
      assert.equal(responseBody<ErrorResponseBody>(response).code, 'REFRESH_TOKEN_EXPIRED');
      assert.ok(responseCookies(response.headers).every((cookie) => cookie.includes('Max-Age=0')));
    });

    void test('revokes only the current customer session on logout', async () => {
      const first = await createCustomerSession();
      const customer = await prisma.customer.findFirstOrThrow();
      const secondCredentials = await app.get(CustomerSessionCrypto).issue(customer.id, new Date());
      await prisma.customerAuthSession.create({
        data: {
          id: secondCredentials.sessionId,
          customerId: customer.id,
          csrfTokenHash: secondCredentials.csrfTokenHash,
          expiresAt: secondCredentials.sessionExpiresAt,
          refreshThrottle: { create: { windowStartedAt: null, attemptCount: 0 } },
          refreshTokens: {
            create: {
              tokenHash: secondCredentials.refreshTokenHash,
              expiresAt: secondCredentials.sessionExpiresAt,
            },
          },
        },
      });
      const response = await sameOrigin(
        request(server(app)).post('/api/v1/customer-auth/logout'),
      )
        .set('Cookie', first.refresh)
        .set('X-CSRF-Token', first.csrfValue)
        .expect(200);
      assert.ok(responseCookies(response.headers).every((cookie) => cookie.includes('Max-Age=0')));
      const sessions = await prisma.customerAuthSession.findMany({ orderBy: { createdAt: 'asc' } });
      assert.ok(sessions[0]?.revokedAt);
      assert.equal(sessions[1]?.revokedAt, null);
    });

    void test('reports authoritative flow stages without revealing account existence', async () => {
      const empty = await sameOrigin(request(server(app)).get('/api/v1/customer-auth/flow')).expect(200);
      assert.deepEqual(
        responseBody<SingleResultEnvelope<{ readonly stage: string }>>(empty).singleResult,
        { stage: 'MOBILE_REQUIRED' },
      );

      const requested = await sameOrigin(
        request(server(app)).post('/api/v1/customer-auth/otp/request'),
      )
        .send({ mobile: '09217101700' })
        .expect(200);
      const otpFlow = cookiePair(responseCookies(requested.headers), CUSTOMER_AUTH_FLOW_COOKIE_NAME);
      const pending = await sameOrigin(request(server(app)).get('/api/v1/customer-auth/flow'))
        .set('Cookie', otpFlow)
        .expect(200);
      const pendingBody = responseBody<
        SingleResultEnvelope<{ readonly stage: string; readonly maskedMobile: string }>
      >(pending);
      assert.equal(pendingBody.singleResult.stage, 'OTP_PENDING');
      assert.equal(pendingBody.singleResult.maskedMobile, '09*****1700');

      const command = sender.commands.at(-1);
      assert.ok(command);
      const verified = await sameOrigin(
        request(server(app)).post('/api/v1/customer-auth/otp/verify'),
      )
        .set('Cookie', otpFlow)
        .send({ code: command.code })
        .expect(200);
      const registrationFlow = cookiePair(
        responseCookies(verified.headers),
        CUSTOMER_AUTH_FLOW_COOKIE_NAME,
      );
      const registration = await sameOrigin(request(server(app)).get('/api/v1/customer-auth/flow'))
        .set('Cookie', registrationFlow)
        .expect(200);
      assert.equal(
        responseBody<SingleResultEnvelope<{ readonly stage: string }>>(registration).singleResult
          .stage,
        'REGISTRATION_REQUIRED',
      );

      const registered = await sameOrigin(
        request(server(app)).post('/api/v1/customer-auth/register'),
      )
        .set('Cookie', registrationFlow)
        .send({ firstName: 'علی', lastName: 'احمدی' })
        .expect(200);
      const customerRefresh = cookiePair(
        responseCookies(registered.headers),
        CUSTOMER_REFRESH_COOKIE_NAME,
      );
      const authenticated = await sameOrigin(request(server(app)).get('/api/v1/customer-auth/flow'))
        .set('Cookie', customerRefresh)
        .expect(200);
      assert.deepEqual(
        responseBody<SingleResultEnvelope<{ readonly stage: string }>>(authenticated).singleResult,
        { stage: 'AUTHENTICATED' },
      );
    });

    void test('never accepts Admin and Customer cookies across authentication boundaries', async () => {
      const cookies = await createCustomerSession();
      await sameOrigin(request(server(app)).post('/api/v1/auth/bootstrap'))
        .set('Cookie', cookies.refresh)
        .expect(401);
      await sameOrigin(request(server(app)).post('/api/v1/customer-auth/bootstrap'))
        .set('Cookie', `admin_refresh_token=${'a'.repeat(43)}`)
        .expect(401);
    });

    void test('publishes lifecycle endpoints and independent cookie schemes in OpenAPI', async () => {
      const document = await request(server(app)).get('/api/docs-json').expect(200);
      const documentBody = responseBody<CustomerSessionOpenApiDocument>(document);
      for (const path of ['bootstrap', 'refresh', 'logout', 'flow']) {
        assert.ok(documentBody.paths[`/api/v1/customer-auth/${path}`]);
      }
      assert.equal(
        documentBody.components.securitySchemes.customerAccess?.name,
        CUSTOMER_ACCESS_COOKIE_NAME,
      );
      assert.equal(
        documentBody.components.securitySchemes.customerRefresh?.name,
        CUSTOMER_REFRESH_COOKIE_NAME,
      );
      assert.match(
        JSON.stringify(documentBody.paths['/api/v1/customer-auth/flow']) ?? '',
        /oneOf/u,
      );
    });
  },
);
