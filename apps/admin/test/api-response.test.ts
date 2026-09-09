import assert from 'node:assert/strict';
import test from 'node:test';

import {
  errorResponse,
  isNoPayloadSuccess,
  parseApiResponse,
  successCollection,
  successSingle,
} from '../app/http/api-response';

const base = {
  statusCode: 200,
  hasError: false,
  message: 'عملیات با موفقیت انجام شد.',
  code: 'OPERATION_SUCCESS',
  count: 0,
  result: null,
  singleResult: null,
  details: null,
};

void test('parses only the exact canonical ApiResponse fields', () => {
  assert.notEqual(parseApiResponse(base), null);
  assert.equal(parseApiResponse({ ...base, unexpected: true }), null);
  assert.equal(parseApiResponse({ ...base, statusCode: '200' }), null);
  assert.equal(parseApiResponse({ ...base, code: 'free text' }), null);
  assert.equal(parseApiResponse({ ...base, message: '   ' }), null);
});

void test('extracts collection, single, and no-payload successes safely', () => {
  assert.deepEqual(successCollection({ ...base, count: 1, result: [{ id: 'one' }] }, 200), [
    { id: 'one' },
  ]);
  assert.deepEqual(successSingle({ ...base, singleResult: { id: 'one' } }, 200), { id: 'one' });
  assert.equal(isNoPayloadSuccess(base, 200), true);
  assert.equal(successSingle({ ...base, hasError: true, singleResult: { id: 'one' } }, 200), null);
  assert.notEqual(
    errorResponse(
      { ...base, statusCode: 409, hasError: true, message: 'تعارض.', code: 'CONFLICT' },
      409,
    ),
    null,
  );
  assert.equal(errorResponse({ ...base, statusCode: 409, hasError: true }, 400), null);
});
