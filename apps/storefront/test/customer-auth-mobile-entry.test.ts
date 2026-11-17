import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mobileEntrySchema,
  normalizeMobileDigits,
} from '../features/customer-auth/mobile-entry';

test('mobile entry accepts and normalizes Persian and Arabic digits', () => {
  assert.equal(normalizeMobileDigits(' ۰۹۱۲۳۴۵۶۷۸۹ '), '09123456789');
  assert.equal(mobileEntrySchema.parse({ mobile: '٠٩١٢٣٤٥٦٧٨٩' }).mobile, '09123456789');
});

test('mobile entry accepts every Backend-supported Iranian mobile format', () => {
  assert.equal(mobileEntrySchema.parse({ mobile: '09123456789' }).mobile, '09123456789');
  assert.equal(mobileEntrySchema.parse({ mobile: '+989123456789' }).mobile, '+989123456789');
  assert.equal(mobileEntrySchema.parse({ mobile: '00989123456789' }).mobile, '00989123456789');
});

test('mobile entry returns linked-form validation messages for empty and invalid values', () => {
  const empty = mobileEntrySchema.safeParse({ mobile: '' });
  const invalid = mobileEntrySchema.safeParse({ mobile: '0912' });

  assert.equal(empty.success, false);
  assert.equal(empty.error?.issues[0]?.message, 'شماره موبایل را وارد کنید.');
  assert.equal(invalid.success, false);
  assert.equal(invalid.error?.issues[0]?.message, 'شماره موبایل معتبر نیست.');
});
