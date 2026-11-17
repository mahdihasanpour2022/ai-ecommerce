import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearRequestedOtpMobile,
  formatOtpCountdown,
  getOtpTiming,
  normalizeOtpInput,
  otpVerificationDestination,
  otpVerificationSchema,
  readRequestedOtpMobile,
  rememberRequestedOtpMobile,
} from '../features/customer-auth/otp-verification';

test('OTP verification normalizes pasted Persian and Arabic digits', () => {
  assert.equal(normalizeOtpInput(' ۱۲٣-٤۵۶ '), '123456');
  assert.equal(otpVerificationSchema.parse({ code: '۱۲۳۴۵۶' }).code, '123456');
  assert.equal(otpVerificationSchema.safeParse({ code: '12345' }).success, false);
});

test('OTP countdown and resend boundary follow the supplied server timestamps', () => {
  const now = Date.parse('2026-11-17T18:00:00.000Z');
  assert.deepEqual(
    getOtpTiming('2026-11-17T18:02:00.000Z', '2026-11-17T18:00:30.000Z', now),
    {
      expiresInSeconds: 120,
      resendInSeconds: 30,
      isExpired: false,
      canResend: false,
    },
  );
  assert.equal(formatOtpCountdown(120), '02:00');
  assert.equal(
    getOtpTiming('2026-11-17T18:04:00.000Z', '2026-11-17T18:00:00.000Z', now).canResend,
    true,
  );
});

test('OTP success branches navigate only to the safe destination or registration', () => {
  assert.equal(otpVerificationDestination('AUTHENTICATED', '/products?page=2'), '/products?page=2');
  assert.equal(
    otpVerificationDestination('REGISTRATION_REQUIRED', '/products?page=2'),
    '/auth/register?returnTo=%2Fproducts%3Fpage%3D2',
  );
});

test('resend mobile remains process-memory-only and can be cleared after proof', () => {
  rememberRequestedOtpMobile('09123456789');
  assert.equal(readRequestedOtpMobile(), '09123456789');
  clearRequestedOtpMobile();
  assert.equal(readRequestedOtpMobile(), null);
});
