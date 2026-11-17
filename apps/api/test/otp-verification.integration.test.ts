import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, test } from 'node:test';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { jwtVerify } from 'jose';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/application';
import {
  CUSTOMER_ACCESS_AUDIENCE,
  CUSTOMER_ACCESS_COOKIE_NAME,
  CUSTOMER_AUTH_FLOW_COOKIE_NAME,
  CUSTOMER_CSRF_COOKIE_NAME,
  CUSTOMER_REFRESH_COOKIE_NAME,
} from '../src/customer-authentication/customer-authentication.constants';
import { OtpRequestService } from '../src/customer-authentication/otp-request.service';
import {
  OTP_SENDER,
  type OtpSender,
  type SendOtpCommand,
  type SendOtpOutcome,
} from '../src/customer-authentication/otp-sender';
import type { ApiEnvironment } from '../src/config/environment';
import { PrismaService } from '../src/database/prisma.service';
import { createTestEnvironment } from './test-environment';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const allowedOrigin = 'http://localhost:3001';

class FakeOtpSender implements OtpSender {
  readonly commands: SendOtpCommand[] = [];

  async send(command: SendOtpCommand): Promise<SendOtpOutcome> {
    this.commands.push(command);
    return { status: 'ACCEPTED' };
  }
}

function server(app: INestApplication): App {
  return app.getHttpServer() as App;
}

function responseCookies(headers: unknown): string[] {
  const value = (headers as Record<string, unknown>)['set-cookie'];
  assert.ok(Array.isArray(value));
  assert.ok(value.every((cookie) => typeof cookie === 'string'));
  return value as string[];
}

function cookiePair(cookies: readonly string[], name: string): string {
  const cookie = cookies.find((value) => value.startsWith(`${name}=`));
  assert.ok(cookie);
  return cookie.slice(0, cookie.indexOf(';'));
}

function cookieValue(cookies: readonly string[], name: string): string {
  return cookiePair(cookies, name).slice(name.length + 1);
}

void describe(
  'Customer OTP verification PostgreSQL and HTTP contract',
  { skip: testDatabaseUrl === undefined, concurrency: 1 },
  () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let sender: FakeOtpSender;
    let requestService: OtpRequestService;
    let environment: ApiEnvironment;

    void beforeEach(async () => {
      sender = new FakeOtpSender();
      environment = createTestEnvironment('test', { DATABASE_URL: testDatabaseUrl });
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
      requestService = moduleRef.get(OtpRequestService);
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

    const requestOtp = (mobile: string) =>
      request(server(app))
        .post('/api/v1/customer-auth/otp/request')
        .set('Origin', allowedOrigin)
        .set('Sec-Fetch-Site', 'same-origin')
        .send({ mobile });

    const verifyOtp = (flowCookie: string, code: unknown) =>
      request(server(app))
        .post('/api/v1/customer-auth/otp/verify')
        .set('Origin', allowedOrigin)
        .set('Sec-Fetch-Site', 'same-origin')
        .set('Cookie', flowCookie)
        .send({ code });

    async function openFlow(mobile = '09217101700') {
      const response = await requestOtp(mobile).expect(200);
      const flowCookie = cookiePair(
        responseCookies(response.headers),
        CUSTOMER_AUTH_FLOW_COOKIE_NAME,
      );
      const command = sender.commands.at(-1);
      assert.ok(command);
      return { flowCookie, code: command.code };
    }

    void test('atomically authenticates an active existing customer with independent cookies', async () => {
      const customer = await prisma.customer.create({
        data: { mobile: '+989217101700', firstName: 'علی', lastName: 'احمدی' },
      });
      const flow = await openFlow();
      const response = await verifyOtp(flow.flowCookie, flow.code)
        .expect(200)
        .expect('Cache-Control', 'no-store');
      assert.deepEqual(response.body.singleResult, {
        nextStep: 'AUTHENTICATED',
        customer: {
          id: customer.id,
          mobile: customer.mobile,
          firstName: customer.firstName,
          lastName: customer.lastName,
        },
      });
      const cookies = responseCookies(response.headers);
      assert.equal(cookies.length, 4);
      assert.match(cookiePair(cookies, CUSTOMER_AUTH_FLOW_COOKIE_NAME), /=$/u);
      const accessToken = cookieValue(cookies, CUSTOMER_ACCESS_COOKIE_NAME);
      const refreshToken = cookieValue(cookies, CUSTOMER_REFRESH_COOKIE_NAME);
      const csrfToken = cookieValue(cookies, CUSTOMER_CSRF_COOKIE_NAME);
      assert.ok(cookies.find((cookie) => cookie.startsWith(CUSTOMER_ACCESS_COOKIE_NAME))?.includes('HttpOnly; SameSite=Lax'));
      assert.ok(cookies.find((cookie) => cookie.startsWith(CUSTOMER_REFRESH_COOKIE_NAME))?.includes('HttpOnly; SameSite=Lax'));
      assert.ok(!cookies.find((cookie) => cookie.startsWith(CUSTOMER_CSRF_COOKIE_NAME))?.includes('HttpOnly'));

      const key = environment.authentication.jwtPublicKeys.get(
        environment.authentication.jwtActiveKid,
      );
      assert.ok(key);
      const verified = await jwtVerify(accessToken, key, {
        issuer: environment.authentication.jwtIssuer,
        audience: CUSTOMER_ACCESS_AUDIENCE,
        typ: 'customer-at+jwt',
      });
      assert.equal(verified.payload.sub, customer.id);
      const session = await prisma.customerAuthSession.findUniqueOrThrow({
        where: { id: verified.payload.sid as string },
        include: { refreshTokens: true, refreshThrottle: true },
      });
      assert.deepEqual(Buffer.from(session.csrfTokenHash), createHash('sha256').update(csrfToken).digest());
      assert.deepEqual(Buffer.from(session.refreshTokens[0]?.tokenHash ?? []), createHash('sha256').update(refreshToken).digest());
      assert.ok(session.refreshThrottle);
      assert.equal(session.expiresAt.getTime() - session.createdAt.getTime(), 7 * 24 * 60 * 60_000);
      assert.equal((await prisma.customer.findUniqueOrThrow({ where: { id: customer.id } })).lastLoginAt?.getTime(), session.createdAt.getTime());
    });

    void test('rotates a verified new mobile only to a server-owned registration grant', async () => {
      const flow = await openFlow();
      const response = await verifyOtp(flow.flowCookie, flow.code).expect(200);
      assert.deepEqual(response.body.singleResult, { nextStep: 'REGISTRATION_REQUIRED' });
      const cookies = responseCookies(response.headers);
      assert.equal(cookies.length, 1);
      const grantToken = cookieValue(cookies, CUSTOMER_AUTH_FLOW_COOKIE_NAME);
      assert.match(grantToken, /^[A-Za-z0-9_-]{43}$/u);
      const grant = await prisma.customerRegistrationGrant.findFirstOrThrow();
      assert.deepEqual(Buffer.from(grant.flowTokenHash), createHash('sha256').update(grantToken).digest());
      assert.equal(grant.expiresAt.getTime() - grant.createdAt.getTime(), 15 * 60_000);
      assert.equal(await prisma.customer.count(), 0);
      assert.equal(await prisma.customerAuthSession.count(), 0);

      const replay = await verifyOtp(flow.flowCookie, flow.code).expect(401);
      assert.equal(replay.body.code, 'AUTH_FLOW_INVALID');
    });

    void test('counts malformed and incorrect codes and terminates exactly on the fifth failure', async () => {
      const flow = await openFlow();
      await verifyOtp(flow.flowCookie, '۱۲۳').expect(422);
      const wrongCode = flow.code === '000000' ? '111111' : '000000';
      for (let index = 0; index < 3; index += 1) {
        const response = await verifyOtp(flow.flowCookie, wrongCode).expect(422);
        assert.equal(response.body.code, 'OTP_INVALID');
        assert.equal(response.headers['set-cookie'], undefined);
      }
      const terminal = await verifyOtp(flow.flowCookie, wrongCode).expect(429);
      assert.equal(terminal.body.code, 'OTP_ATTEMPTS_EXCEEDED');
      assert.match(cookiePair(responseCookies(terminal.headers), CUSTOMER_AUTH_FLOW_COOKIE_NAME), /=$/u);
      const challenge = await prisma.customerOtpChallenge.findFirstOrThrow();
      assert.equal(challenge.failedAttemptCount, 5);
      assert.ok(challenge.invalidatedAt);
      assert.equal(challenge.verifiedAt, null);
    });

    void test('rejects expired, consumed and disabled-account flows without issuing authority', async () => {
      const expired = await requestService.request(
        '+989120000000',
        new Date(Date.now() - 3 * 60_000),
      );
      const expiredResponse = await verifyOtp(
        `${CUSTOMER_AUTH_FLOW_COOKIE_NAME}=${expired.flowToken}`,
        sender.commands.at(-1)?.code,
      ).expect(410);
      assert.equal(expiredResponse.body.code, 'OTP_EXPIRED');

      const disabledCustomer = await prisma.customer.create({
        data: {
          mobile: '+989217101700',
          firstName: 'علی',
          lastName: 'احمدی',
        },
      });
      await prisma.customer.update({
        where: { id: disabledCustomer.id },
        data: { disabledAt: new Date() },
      });
      const disabled = await openFlow();
      const disabledResponse = await verifyOtp(disabled.flowCookie, disabled.code).expect(403);
      assert.equal(disabledResponse.body.code, 'CUSTOMER_ACCOUNT_DISABLED');
      assert.equal(await prisma.customerAuthSession.count(), 0);
      assert.ok((await prisma.customerOtpChallenge.findFirstOrThrow({ where: { mobile: '+989217101700' } })).verifiedAt);
    });

    void test('allows only one winner for concurrent correct verification', async () => {
      await prisma.customer.create({
        data: { mobile: '+989217101700', firstName: 'علی', lastName: 'احمدی' },
      });
      const flow = await openFlow();
      const responses = await Promise.all(
        Array.from({ length: 6 }, () => verifyOtp(flow.flowCookie, flow.code)),
      );
      assert.equal(responses.filter((response) => response.status === 200).length, 1);
      assert.equal(responses.filter((response) => response.status === 401).length, 5);
      assert.equal(await prisma.customerAuthSession.count(), 1);
      assert.equal(await prisma.customerRegistrationGrant.count(), 0);
    });

    void test('publishes the exact verification responses in OpenAPI', async () => {
      const document = await request(server(app)).get('/api/docs-json').expect(200);
      const operation = document.body.paths['/api/v1/customer-auth/otp/verify'].post;
      assert.deepEqual(Object.keys(operation.responses).sort(), [
        '200',
        '401',
        '403',
        '410',
        '422',
        '429',
        '500',
      ]);
      assert.match(JSON.stringify(operation), /OTP_ATTEMPTS_EXCEEDED|Retry-After/u);
      assert.match(JSON.stringify(operation.responses['200']), /oneOf/u);
    });
  },
);
