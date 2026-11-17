import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
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

interface RegistrationOpenApiDocument {
  readonly paths: Record<
    string,
    { readonly post: { readonly responses: Record<string, unknown> } }
  >;
  readonly components: { readonly schemas: Record<string, unknown> };
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

void describe(
  'Customer registration PostgreSQL and HTTP contract',
  { skip: testDatabaseUrl === undefined, concurrency: 1 },
  () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let sender: FakeOtpSender;
    let sessionCrypto: CustomerSessionCrypto;

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
      sessionCrypto = moduleRef.get(CustomerSessionCrypto);
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

    const post = (path: string) =>
      request(server(app))
        .post(path)
        .set('Origin', allowedOrigin)
        .set('Sec-Fetch-Site', 'same-origin');

    const register = (flowCookie: string, body: object) =>
      post('/api/v1/customer-auth/register').set('Cookie', flowCookie).send(body);

    async function openRegistrationFlow(mobile = '09217101700'): Promise<string> {
      const requested = await post('/api/v1/customer-auth/otp/request').send({ mobile }).expect(200);
      const otpFlowCookie = cookiePair(
        responseCookies(requested.headers),
        CUSTOMER_AUTH_FLOW_COOKIE_NAME,
      );
      const command = sender.commands.at(-1);
      assert.ok(command);
      const verified = await post('/api/v1/customer-auth/otp/verify')
        .set('Cookie', otpFlowCookie)
        .send({ code: command.code })
        .expect(200);
      const body = responseBody<SingleResultEnvelope<{ readonly nextStep: string }>>(verified);
      assert.equal(body.singleResult.nextStep, 'REGISTRATION_REQUIRED');
      return cookiePair(responseCookies(verified.headers), CUSTOMER_AUTH_FLOW_COOKIE_NAME);
    }

    async function seedRegistrationGrant(mobile: string): Promise<string> {
      const token = randomBytes(32).toString('base64url');
      const now = new Date();
      const challenge = await prisma.customerOtpChallenge.create({
        data: {
          id: randomUUID(),
          flowTokenHash: Uint8Array.from(randomBytes(32)),
          mobile,
          otpDigest: Uint8Array.from(randomBytes(32)),
          clientReferenceId: randomUUID(),
          deliveryStatus: 'ACCEPTED',
          expiresAt: new Date(now.getTime() + 120_000),
          resendAvailableAt: new Date(now.getTime() + 120_000),
          verifiedAt: now,
          createdAt: now,
          updatedAt: now,
        },
      });
      await prisma.customerRegistrationGrant.create({
        data: {
          challengeId: challenge.id,
          flowTokenHash: Uint8Array.from(createHash('sha256').update(token).digest()),
          expiresAt: new Date(now.getTime() + 15 * 60_000),
          createdAt: now,
          updatedAt: now,
        },
      });
      return `${CUSTOMER_AUTH_FLOW_COOKIE_NAME}=${token}`;
    }

    void test('creates the customer and authenticated session from server-owned mobile state', async () => {
      const flowCookie = await openRegistrationFlow();
      const response = await register(flowCookie, {
        firstName: '  علی  رضا ',
        lastName: 'نیک‌پی',
      })
        .expect(200)
        .expect('Cache-Control', 'no-store');
      const customer = await prisma.customer.findFirstOrThrow();
      assert.deepEqual(responseBody<SingleResultEnvelope<unknown>>(response).singleResult, {
        nextStep: 'AUTHENTICATED',
        redirectTo: '/',
        customer: {
          id: customer.id,
          mobile: '+989217101700',
          firstName: 'علی رضا',
          lastName: 'نیک‌پی',
        },
      });
      const cookies = responseCookies(response.headers);
      assert.equal(cookies.length, 4);
      assert.match(cookiePair(cookies, CUSTOMER_AUTH_FLOW_COOKIE_NAME), /=$/u);
      assert.ok(cookies.some((cookie) => cookie.startsWith(`${CUSTOMER_ACCESS_COOKIE_NAME}=`) && cookie.includes('HttpOnly')));
      assert.ok(cookies.some((cookie) => cookie.startsWith(`${CUSTOMER_REFRESH_COOKIE_NAME}=`) && cookie.includes('HttpOnly')));
      assert.ok(cookies.some((cookie) => cookie.startsWith(`${CUSTOMER_CSRF_COOKIE_NAME}=`) && !cookie.includes('HttpOnly')));
      assert.equal(await prisma.customerAuthSession.count(), 1);
      assert.equal(await prisma.customerRefreshToken.count(), 1);
      assert.ok((await prisma.customerRegistrationGrant.findFirstOrThrow()).consumedAt);
    });

    void test('preserves an unconsumed grant after authoritative name validation fails', async () => {
      const flowCookie = await openRegistrationFlow();
      const response = await register(flowCookie, {
        firstName: 'ع',
        lastName: '<script>',
      }).expect(422);
      assert.equal(responseBody<ErrorResponseBody>(response).code, 'CUSTOMER_NAME_INVALID');
      assert.equal(response.headers['set-cookie'], undefined);
      assert.equal((await prisma.customerRegistrationGrant.findFirstOrThrow()).consumedAt, null);
      assert.equal(await prisma.customer.count(), 0);
    });

    void test('fails closed for expired and tampered registration state', async () => {
      const flowCookie = await openRegistrationFlow();
      const expiredAt = new Date(Date.now() - 1_000);
      await prisma.customerRegistrationGrant.updateMany({
        data: {
          createdAt: new Date(expiredAt.getTime() - 15 * 60_000),
          expiresAt: expiredAt,
        },
      });
      const expired = await register(flowCookie, {
        firstName: 'علی',
        lastName: 'احمدی',
      }).expect(410);
      assert.equal(responseBody<ErrorResponseBody>(expired).code, 'REGISTRATION_GRANT_EXPIRED');
      assert.match(cookiePair(responseCookies(expired.headers), CUSTOMER_AUTH_FLOW_COOKIE_NAME), /=$/u);

      const tampered = await register(`${CUSTOMER_AUTH_FLOW_COOKIE_NAME}=${'a'.repeat(43)}`, {
        firstName: 'علی',
        lastName: 'احمدی',
      }).expect(401);
      assert.equal(responseBody<ErrorResponseBody>(tampered).code, 'AUTH_FLOW_INVALID');
      assert.equal(await prisma.customer.count(), 0);
      assert.equal(await prisma.customerAuthSession.count(), 0);
    });

    void test('allows exactly one winner when the same grant is submitted concurrently', async () => {
      const flowCookie = await openRegistrationFlow();
      const responses = await Promise.all(
        Array.from({ length: 6 }, () =>
          register(flowCookie, { firstName: 'علی', lastName: 'احمدی' }),
        ),
      );
      assert.equal(responses.filter((response) => response.status === 200).length, 1);
      assert.equal(responses.filter((response) => response.status === 401).length, 5);
      assert.equal(await prisma.customer.count(), 1);
      assert.equal(await prisma.customerAuthSession.count(), 1);
    });

    void test('serializes separate verified grants for one mobile without duplicate customers', async () => {
      const [firstFlow, secondFlow] = await Promise.all([
        seedRegistrationGrant('+989120000000'),
        seedRegistrationGrant('+989120000000'),
      ]);
      const responses = await Promise.all([
        register(firstFlow, { firstName: 'علی', lastName: 'اول' }),
        register(secondFlow, { firstName: 'علی', lastName: 'دوم' }),
      ]);
      assert.equal(responses.filter((response) => response.status === 200).length, 2);
      assert.equal(await prisma.customer.count(), 1);
      assert.equal(await prisma.customerAuthSession.count(), 2);
      assert.equal(
        await prisma.customerRegistrationGrant.count({ where: { consumedAt: { not: null } } }),
        2,
      );
    });

    void test('rejects a disabled conflicting customer and consumes no session authority', async () => {
      const flowCookie = await openRegistrationFlow();
      const disabledAt = new Date();
      await prisma.customer.create({
        data: {
          mobile: '+989217101700',
          firstName: 'کاربر',
          lastName: 'غیرفعال',
          createdAt: new Date(disabledAt.getTime() - 1_000),
          updatedAt: disabledAt,
          disabledAt,
        },
      });
      const response = await register(flowCookie, {
        firstName: 'علی',
        lastName: 'احمدی',
      }).expect(403);
      assert.equal(responseBody<ErrorResponseBody>(response).code, 'CUSTOMER_ACCOUNT_DISABLED');
      assert.equal(await prisma.customerAuthSession.count(), 0);
      assert.ok((await prisma.customerRegistrationGrant.findFirstOrThrow()).invalidatedAt);
    });

    void test('rolls back customer and grant changes when session issuance fails', async () => {
      const flowCookie = await openRegistrationFlow();
      const originalIssue = sessionCrypto.issue.bind(sessionCrypto);
      sessionCrypto.issue = () => Promise.reject(new Error('simulated session failure'));
      try {
        await register(flowCookie, { firstName: 'علی', lastName: 'احمدی' }).expect(500);
      } finally {
        sessionCrypto.issue = originalIssue;
      }
      assert.equal(await prisma.customer.count(), 0);
      const grant = await prisma.customerRegistrationGrant.findFirstOrThrow();
      assert.equal(grant.consumedAt, null);
      assert.equal(grant.invalidatedAt, null);
    });

    void test('publishes the exact registration contract in OpenAPI', async () => {
      const document = await request(server(app)).get('/api/docs-json').expect(200);
      const documentBody = responseBody<RegistrationOpenApiDocument>(document);
      const operation = documentBody.paths['/api/v1/customer-auth/register']?.post;
      assert.ok(operation);
      assert.deepEqual(Object.keys(operation.responses).sort(), [
        '200',
        '401',
        '403',
        '410',
        '422',
        '500',
      ]);
      assert.match(JSON.stringify(operation) ?? '', /CustomerRegistrationRequestDto/u);
      assert.match(
        JSON.stringify(documentBody.components.schemas.CustomerRegistrationResponseDto) ?? '',
        /redirectTo/u,
      );
    });
  },
);
