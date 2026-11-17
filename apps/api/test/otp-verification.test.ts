import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { IncomingMessage } from 'node:http';

import { CustomerAuthenticationError } from '../src/customer-authentication/customer-authentication.errors';
import { OtpRequestCrypto } from '../src/customer-authentication/otp-request.crypto';
import { parseOtpVerification } from '../src/customer-authentication/otp-verification.dto';
import { OtpVerificationSecurity } from '../src/customer-authentication/otp-verification.security';
import { createTestEnvironment } from './test-environment';

function requestFrom(ip: string): IncomingMessage {
  return { socket: { remoteAddress: ip } } as unknown as IncomingMessage;
}

void describe('Customer OTP verification policy', () => {
  void test('normalizes Persian and Arabic digits without trimming or accepting extra fields', () => {
    assert.deepEqual(parseOtpVerification({ code: '۱۲۳۴۵۶' }), {
      code: '123456',
      validFormat: true,
    });
    assert.deepEqual(parseOtpVerification({ code: '١٢٣٤٥٦' }), {
      code: '123456',
      validFormat: true,
    });
    for (const body of [{ code: '12345' }, { code: ' 123456 ' }, { code: '123456', extra: true }]) {
      assert.equal(parseOtpVerification(body).validFormat, false);
    }
  });

  void test('verifies only the keyed digest bound to its challenge and mobile', () => {
    const crypto = new OtpRequestCrypto(createTestEnvironment());
    const issued = crypto.issue('+989217101700');
    assert.equal(
      crypto.verifyOtp(issued.challengeId, '+989217101700', issued.code, issued.otpDigest),
      true,
    );
    assert.equal(
      crypto.verifyOtp(issued.challengeId, '+989120000000', issued.code, issued.otpDigest),
      false,
    );
  });

  void test('enforces the rolling failed-verification IP limit including reservations', () => {
    const security = new OtpVerificationSecurity();
    const request = requestFrom('127.0.0.1');
    const now = Date.UTC(2026, 0, 1);
    for (let index = 0; index < 30; index += 1) {
      security.commitFailure(security.reserve(request, now), now);
    }
    assert.throws(
      () => security.reserve(request, now),
      (error: unknown) =>
        error instanceof CustomerAuthenticationError &&
        error.code === 'AUTH_RATE_LIMITED' &&
        error.retryAfterSeconds === 900,
    );
  });
});
