import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { IncomingMessage } from 'node:http';

import { CustomerAuthenticationError } from '../src/customer-authentication/customer-authentication.errors';
import { maskMobile, parseOtpRequest } from '../src/customer-authentication/otp-request.dto';
import { OtpRequestSecurity } from '../src/customer-authentication/otp-request.security';

function requestFrom(ip: string): IncomingMessage {
  return { socket: { remoteAddress: ip } } as IncomingMessage;
}

void describe('Customer OTP request policy', () => {
  void test('normalizes supported Iranian mobile forms and masks only the display value', () => {
    assert.equal(parseOtpRequest({ mobile: ' 09217101700 ' }).mobile, '+989217101700');
    assert.equal(parseOtpRequest({ mobile: '۰۹۲۱۷۱۰۱۷۰۰' }).mobile, '+989217101700');
    assert.equal(parseOtpRequest({ mobile: '٠٩٢١٧١٠١٧٠٠' }).mobile, '+989217101700');
    assert.equal(parseOtpRequest({ mobile: '+989217101700' }).mobile, '+989217101700');
    assert.equal(parseOtpRequest({ mobile: '00989217101700' }).mobile, '+989217101700');
    assert.equal(maskMobile('+989217101700'), '09*****1700');
  });

  void test('rejects malformed bodies with the stable mobile validation contract', () => {
    for (const body of [null, {}, { mobile: '9217101700' }, { mobile: '09217101700', extra: true }]) {
      assert.throws(
        () => parseOtpRequest(body),
        (error: unknown) =>
          error instanceof CustomerAuthenticationError &&
          error.statusCode === 422 &&
          error.code === 'MOBILE_INVALID',
      );
    }
  });

  void test('counts only committed or concurrent IP sends and releases rejected reservations', () => {
    const security = new OtpRequestSecurity();
    const request = requestFrom('127.0.0.1');
    const now = Date.UTC(2026, 0, 1);
    const released = security.reserve(request, now);
    security.release(released);
    for (let index = 0; index < 20; index += 1) {
      security.commit(security.reserve(request, now), now);
    }
    assert.throws(
      () => security.reserve(request, now),
      (error: unknown) =>
        error instanceof CustomerAuthenticationError &&
        error.statusCode === 429 &&
        error.code === 'AUTH_RATE_LIMITED' &&
        error.retryAfterSeconds === 900,
    );
  });
});
