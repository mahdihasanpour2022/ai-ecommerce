import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { after, before, beforeEach, describe, test } from 'node:test';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../src/generated/prisma/client.js';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

// هر کلاینت اتصال مستقلی می‌سازد تا رقابت‌های واقعی PostgreSQL قابل بررسی باشند.
function createClient(): PrismaClient {
  assert.ok(testDatabaseUrl);
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: testDatabaseUrl }),
  });
}

// تاریخ آینده را بدون وابستگی به ساعت ثابت تست تولید می‌کند.
function minutesFromNow(minutes: number): Date {
  return new Date(Date.now() + minutes * 60_000);
}

void describe(
  'Customer authentication PostgreSQL invariants',
  { skip: testDatabaseUrl === undefined, concurrency: 1 },
  () => {
    let primary: PrismaClient;
    let contenderA: PrismaClient;
    let contenderB: PrismaClient;

    // داده‌های احراز هویت مشتری با رعایت ترتیب وابستگی کلیدهای خارجی پاک می‌شوند.
    async function clearCustomerAuthentication(): Promise<void> {
      await primary.$transaction(async (transaction) => {
        await transaction.customerRegistrationGrant.deleteMany();
        await transaction.customerRefreshToken.deleteMany();
        await transaction.customerAuthSessionRefreshThrottle.deleteMany();
        await transaction.customerAuthSession.deleteMany();
        await transaction.customerOtpChallenge.deleteMany();
        await transaction.customerOtpMobileThrottle.deleteMany();
        await transaction.customer.deleteMany();
      });
    }

    // یک چالش معتبر پایه برای سناریوهای قیود و grant ایجاد می‌کند.
    async function createChallenge(mobile = '+989217101700'): Promise<{ id: string }> {
      return primary.customerOtpChallenge.create({
        data: {
          flowTokenHash: randomBytes(32),
          mobile,
          otpDigest: randomBytes(32),
          clientReferenceId: randomUUID(),
          deliveryStatus: 'ACCEPTED',
          expiresAt: minutesFromNow(2),
          resendAvailableAt: minutesFromNow(2),
        },
        select: { id: true },
      });
    }

    // مشتری و نشست پایه را برای سناریوهای refresh می‌سازد.
    async function createSession(mobile: string): Promise<{ id: string }> {
      const customer = await primary.customer.create({
        data: { mobile, firstName: 'علی', lastName: 'احمدی' },
        select: { id: true },
      });

      return primary.customerAuthSession.create({
        data: {
          customerId: customer.id,
          csrfTokenHash: randomBytes(32),
          expiresAt: minutesFromNow(60),
        },
        select: { id: true },
      });
    }

    void before(async () => {
      primary = createClient();
      contenderA = createClient();
      contenderB = createClient();
      await Promise.all([primary.$connect(), contenderA.$connect(), contenderB.$connect()]);
    });

    void beforeEach(clearCustomerAuthentication);

    void after(async () => {
      await clearCustomerAuthentication();
      await Promise.all([
        primary.$disconnect(),
        contenderA.$disconnect(),
        contenderB.$disconnect(),
      ]);
    });

    void test('accepts one canonical Customer for a concurrent mobile registration', async () => {
      const mobile = '+989217101700';
      const outcomes = await Promise.allSettled([
        contenderA.customer.create({
          data: { mobile, firstName: 'علی', lastName: 'احمدی' },
        }),
        contenderB.customer.create({
          data: { mobile, firstName: 'رضا', lastName: 'محمدی' },
        }),
      ]);

      assert.equal(outcomes.filter(({ status }) => status === 'fulfilled').length, 1);
      assert.equal(outcomes.filter(({ status }) => status === 'rejected').length, 1);
      assert.equal(await primary.customer.count({ where: { mobile } }), 1);

      await assert.rejects(
        primary.customer.create({
          data: { mobile: '09217101700', firstName: 'علی', lastName: 'احمدی' },
        }),
      );
    });

    void test('allows only one open OTP challenge per mobile and enforces digest length', async () => {
      const first = await createChallenge();

      await assert.rejects(createChallenge());
      await assert.rejects(
        primary.customerOtpChallenge.create({
          data: {
            flowTokenHash: randomBytes(32),
            mobile: '+989121234567',
            otpDigest: randomBytes(31),
            clientReferenceId: randomUUID(),
            deliveryStatus: 'ACCEPTED',
            expiresAt: minutesFromNow(2),
            resendAvailableAt: minutesFromNow(2),
          },
        }),
      );
      await assert.rejects(
        primary.customerOtpChallenge.create({
          data: {
            flowTokenHash: randomBytes(32),
            mobile: '+989121234567',
            otpDigest: randomBytes(32),
            clientReferenceId: randomUUID(),
            deliveryStatus: 'PENDING',
            failedAttemptCount: 6,
            verifiedAt: new Date(),
            expiresAt: minutesFromNow(2),
            resendAvailableAt: minutesFromNow(2),
          },
        }),
      );
      await assert.rejects(
        primary.customerOtpChallenge.create({
          data: {
            flowTokenHash: randomBytes(32),
            mobile: '+989121234567',
            otpDigest: randomBytes(32),
            clientReferenceId: randomUUID(),
            deliveryStatus: 'ACCEPTED',
            expiresAt: minutesFromNow(-1),
            resendAvailableAt: minutesFromNow(-1),
          },
        }),
      );

      await primary.customerOtpChallenge.update({
        where: { id: first.id },
        data: { invalidatedAt: new Date() },
      });
      await createChallenge();

      assert.equal(
        await primary.customerOtpChallenge.count({ where: { mobile: '+989217101700' } }),
        2,
      );
    });

    void test('keeps a registration grant single-use and restricts challenge deletion', async () => {
      const challenge = await createChallenge();
      await primary.customerOtpChallenge.update({
        where: { id: challenge.id },
        data: { verifiedAt: new Date() },
      });
      const outcomes = await Promise.allSettled([
        contenderA.customerRegistrationGrant.create({
          data: {
            challengeId: challenge.id,
            flowTokenHash: randomBytes(32),
            expiresAt: minutesFromNow(10),
          },
        }),
        contenderB.customerRegistrationGrant.create({
          data: {
            challengeId: challenge.id,
            flowTokenHash: randomBytes(32),
            expiresAt: minutesFromNow(10),
          },
        }),
      ]);

      assert.equal(outcomes.filter(({ status }) => status === 'fulfilled').length, 1);
      assert.equal(outcomes.filter(({ status }) => status === 'rejected').length, 1);
      const grant = await primary.customerRegistrationGrant.findUniqueOrThrow({
        where: { challengeId: challenge.id },
      });
      await assert.rejects(
        primary.customerRegistrationGrant.update({
          where: { id: grant.id },
          data: { consumedAt: new Date(), invalidatedAt: new Date() },
        }),
      );
      await assert.rejects(primary.customerOtpChallenge.delete({ where: { id: challenge.id } }));
    });

    void test('selects one current refresh token and forbids cross-session replacement', async () => {
      const session = await createSession('+989217101700');
      const outcomes = await Promise.allSettled([
        contenderA.customerRefreshToken.create({
          data: { sessionId: session.id, tokenHash: randomBytes(32), expiresAt: minutesFromNow(30) },
        }),
        contenderB.customerRefreshToken.create({
          data: { sessionId: session.id, tokenHash: randomBytes(32), expiresAt: minutesFromNow(30) },
        }),
      ]);

      assert.equal(outcomes.filter(({ status }) => status === 'fulfilled').length, 1);
      assert.equal(outcomes.filter(({ status }) => status === 'rejected').length, 1);

      const current = await primary.customerRefreshToken.findFirstOrThrow({
        where: { sessionId: session.id },
      });
      await primary.customerRefreshToken.update({
        where: { id: current.id },
        data: { rotatedAt: new Date() },
      });
      const replacement = await primary.customerRefreshToken.create({
        data: {
          sessionId: session.id,
          tokenHash: randomBytes(32),
          expiresAt: minutesFromNow(30),
        },
      });
      await primary.customerRefreshToken.update({
        where: { id: current.id },
        data: { replacedByTokenId: replacement.id },
      });

      const otherSession = await createSession('+989121234567');
      const otherToken = await primary.customerRefreshToken.create({
        data: {
          sessionId: otherSession.id,
          tokenHash: randomBytes(32),
          expiresAt: minutesFromNow(30),
        },
      });

      await assert.rejects(
        primary.customerRefreshToken.update({
          where: { id: current.id },
          data: { replacedByTokenId: otherToken.id },
        }),
      );
    });

    void test('selects only rows older than the approved cleanup retention boundaries', async () => {
      const oldChallenge = await createChallenge('+989217101700');
      const recentChallenge = await createChallenge('+989121234567');
      await primary.$executeRaw`
        UPDATE "customer_otp_challenges"
        SET "invalidated_at" = CURRENT_TIMESTAMP - INTERVAL '25 hours',
            "expires_at" = CURRENT_TIMESTAMP - INTERVAL '25 hours',
            "resend_available_at" = CURRENT_TIMESTAMP - INTERVAL '25 hours',
            "created_at" = CURRENT_TIMESTAMP - INTERVAL '26 hours',
            "updated_at" = CURRENT_TIMESTAMP - INTERVAL '25 hours'
        WHERE "id" = ${oldChallenge.id}::uuid
      `;
      await primary.customerOtpChallenge.update({
        where: { id: recentChallenge.id },
        data: { invalidatedAt: new Date() },
      });

      const eligible = await primary.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "customer_otp_challenges"
        WHERE COALESCE("verified_at", "invalidated_at", "expires_at")
          < CURRENT_TIMESTAMP - INTERVAL '24 hours'
      `;

      assert.deepEqual(eligible.map(({ id }) => id), [oldChallenge.id]);
    });
  },
);
