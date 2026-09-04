import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyCatalogFailure } from '../app/catalog/catalog-errors';
import { AdminHttpError } from '../app/http/http-client';

void test('classifies cancellation, transport, permission, missing, validation, and conflict safely', () => {
  assert.equal(
    classifyCatalogFailure(new AdminHttpError('canceled', null, 'REQUEST_CANCELED')).kind,
    'canceled',
  );
  assert.equal(
    classifyCatalogFailure(new AdminHttpError('network', null, 'NETWORK_ERROR')).retryable,
    true,
  );
  assert.equal(
    classifyCatalogFailure(new AdminHttpError('http', 403, 'INSUFFICIENT_PERMISSION')).kind,
    'forbidden',
  );
  assert.equal(
    classifyCatalogFailure(new AdminHttpError('http', 404, 'PRODUCT_NOT_FOUND')).kind,
    'not-found',
  );
  assert.equal(
    classifyCatalogFailure(new AdminHttpError('http', 400, 'VALIDATION_FAILED')).kind,
    'validation',
  );
  assert.equal(
    classifyCatalogFailure(new AdminHttpError('http', 409, 'PRODUCT_LIFECYCLE_CONFLICT')).kind,
    'conflict',
  );
});

void test('never exposes an unknown thrown diagnostic as display text', () => {
  const failure = classifyCatalogFailure(new Error('database password leaked'));
  assert.equal(failure.kind, 'server');
  assert.doesNotMatch(failure.message, /database|password|leaked/iu);
});
