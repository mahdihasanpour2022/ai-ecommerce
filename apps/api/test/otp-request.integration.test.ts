import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, test } from 'node:test';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/application';
import { CustomerAuthenticationError } from '../src/customer-authentication/customer-authentication.errors';
import { OtpRequestService } from '../src/customer-authentication/otp-request.service';
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
  outcome: SendOtpOutcome = { status: 'ACCEPTED' };

  async send(command: SendOtpCommand): Promise<SendOtpOutcome> {
    this.commands.push(command);
    return this.outcome;
  }
}

function server(app: INestApplication): App {
  return app.getHttpServer() as App;
}

function firstResponseCookie(headers: unknown): string {
  const value = (headers as Record<string, unknown>)['set-cookie'];
  assert.ok(Array.isArray(value));
  const cookie = value[0];
  assert.equal(typeof cookie, 'string');
  return cookie as string;
}

void describe(
  'Customer OTP request PostgreSQL and HTTP contract',
  { skip: testDatabaseUrl === undefined, concurrency: 1 },
  () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let sender: FakeOtpSender;
    let service: OtpRequestService;

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
      service = moduleRef.get(OtpRequestService);
      await prisma.customerRegistrationGrant.deleteMany();
      await prisma.customerOtpChallenge.deleteMany();
      await prisma.customerOtpMobileThrottle.deleteMany();
      await prisma.customer.deleteMany();
    });

    void afterEach(async () => {
      await prisma.customerRegistrationGrant.deleteMany();
      await prisma.customerOtpChallenge.deleteMany();
      await prisma.customerOtpMobileThrottle.deleteMany();
      await prisma.customer.deleteMany();
      await app.close();
    });

    const requestOtp = (mobile: string) =>
      request(server(app))
        .post('/api/v1/customer-auth/otp/request')
        .set('Origin', allowedOrigin)
        .set('Sec-Fetch-Site', 'same-origin')
        .send({ mobile });

    void test('returns the same generic contract for existing and new customers', async () => {
      await prisma.customer.create({
        data: { mobile: '+989217101700', firstName: 'علی', lastName: 'احمدی' },
      });
      const existing = await requestOtp('09217101700').expect(200).expect('Cache-Control', 'no-store');
      const fresh = await requestOtp('09120000000').expect(200);
      for (const response of [existing, fresh]) {
        assert.equal(response.body.code, 'OTP_REQUESTED');
        assert.equal(response.body.singleResult.stage, 'OTP_PENDING');
        assert.deepEqual(Object.keys(response.body.singleResult).sort(), [
          'expiresAt',
          'maskedMobile',
          'resendAvailableAt',
          'stage',
        ]);
        assert.match(firstResponseCookie(response.headers), /storefront_customer_auth_flow=/u);
        assert.match(firstResponseCookie(response.headers), /HttpOnly; SameSite=Strict/u);
      }
      assert.equal(sender.commands.length, 2);
      assert.ok(sender.commands.every((command) => /^\d{6}$/u.test(command.code)));
      const stored = await prisma.customerOtpChallenge.findMany();
      assert.equal(stored.length, 2);
      assert.ok(stored.every((challenge) => challenge.otpDigest.length === 32));
      assert.ok(
        stored.every(
          (challenge) =>
            !sender.commands.some(
              (item) => Buffer.from(challenge.otpDigest).toString('utf8') === item.code,
            ),
        ),
      );

      const openApi = await request(server(app)).get('/api/docs-json').expect(200);
      const operation = openApi.body.paths['/api/v1/customer-auth/otp/request'].post;
      assert.deepEqual(Object.keys(operation.responses).sort(), [
        '200',
        '403',
        '422',
        '429',
        '500',
        '503',
      ]);
      assert.match(JSON.stringify(operation), /Retry-After/u);
    });

    void test('blocks cooldown before provider dispatch and serializes concurrent requests', async () => {
      const results = await Promise.all(
        Array.from({ length: 6 }, () => requestOtp('09217101700')),
      );
      assert.equal(results.filter((response) => response.status === 200).length, 1);
      assert.equal(results.filter((response) => response.status === 429).length, 5);
      assert.ok(
        results
          .filter((response) => response.status === 429)
          .every((response) => response.body.code === 'OTP_RESEND_NOT_READY'),
      );
      assert.equal(sender.commands.length, 1);
      assert.equal(await prisma.customerOtpChallenge.count(), 1);
    });

    void test('persists provider rejection and ambiguity without reporting successful delivery', async () => {
      sender.outcome = { status: 'REJECTED' };
      const rejected = await requestOtp('09217101700').expect(503);
      assert.equal(rejected.body.code, 'OTP_SEND_UNAVAILABLE');
      assert.match(firstResponseCookie(rejected.headers), /Max-Age=0/u);
      const failed = await prisma.customerOtpChallenge.findFirstOrThrow();
      assert.equal(failed.deliveryStatus, 'FAILED');
      assert.ok(failed.invalidatedAt);

      sender.outcome = { status: 'UNKNOWN' };
      const unknown = await requestOtp('09120000000').expect(503);
      assert.equal(unknown.body.code, 'OTP_SEND_UNAVAILABLE');
      assert.match(firstResponseCookie(unknown.headers), /HttpOnly/u);
      const ambiguous = await prisma.customerOtpChallenge.findFirstOrThrow({
        where: { mobile: '+989120000000' },
      });
      assert.equal(ambiguous.deliveryStatus, 'UNKNOWN');
      assert.equal(ambiguous.invalidatedAt, null);
    });

    void test('expires prior codes and enforces durable rolling mobile limits', async () => {
      const mobile = '+989217101700';
      const start = new Date('2026-01-01T00:00:00.000Z');
      for (let index = 0; index < 3; index += 1) {
        await service.request(mobile, new Date(start.getTime() + index * 121_000));
      }
      await assert.rejects(
        service.request(mobile, new Date(start.getTime() + 3 * 121_000)),
        (error: unknown) =>
          error instanceof CustomerAuthenticationError && error.code === 'AUTH_RATE_LIMITED',
      );
      assert.equal(sender.commands.length, 3);
      const challenges = await prisma.customerOtpChallenge.findMany({
        orderBy: { createdAt: 'asc' },
      });
      assert.equal(challenges.length, 3);
      assert.ok(challenges.slice(0, 2).every((challenge) => challenge.invalidatedAt !== null));
      assert.equal(challenges[2]?.invalidatedAt, null);
    });
  },
);
