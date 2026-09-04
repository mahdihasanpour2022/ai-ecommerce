import assert from 'node:assert/strict';
import test from 'node:test';
import { AdminHttpError } from '../app/http/http-client';
import { productFailurePresentation } from '../app/catalog/products/product-failures';

void test('maps Product conflicts and allowlisted validation details to safe Persian fields', () => {
  assert.deepEqual(
    productFailurePresentation(
      new AdminHttpError('http', 400, 'VALIDATION_FAILED', null, ['priceRial']),
    ),
    {
      code: 'VALIDATION_FAILED',
      message: 'اطلاعات فرم معتبر نیست. فیلدهای مشخص‌شده را بررسی کنید.',
      field: 'price',
    },
  );
  assert.equal(
    productFailurePresentation(new AdminHttpError('http', 409, 'SKU_CONFLICT')).message,
    'این کد کالا قبلاً استفاده شده است. کد دیگری وارد کنید.',
  );
  assert.equal(
    productFailurePresentation(
      new AdminHttpError('http', 400, 'VALIDATION_FAILED', null, ['internal.secret']),
    ).field,
    undefined,
  );
});

void test('maps CSRF, permission, missing Category, and transport outcomes without diagnostics', () => {
  for (const error of [
    new AdminHttpError('http', 403, 'CSRF_VALIDATION_FAILED'),
    new AdminHttpError('http', 403, 'INSUFFICIENT_PERMISSION'),
    new AdminHttpError('http', 404, 'CATEGORY_NOT_FOUND'),
    new AdminHttpError('network', null, 'NETWORK_ERROR'),
  ]) {
    const result = productFailurePresentation(error);
    assert.equal(result.message.includes('Admin HTTP'), false);
    assert.equal(result.message.length > 0, true);
  }
});
