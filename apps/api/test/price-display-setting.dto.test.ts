import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { parseUpdatePriceDisplaySettingRequest } from '../src/catalog/price-display-setting.dto.js';
import { PriceDisplaySettingError } from '../src/catalog/price-display-setting.errors.js';

function expectValidation(body: unknown): void {
  assert.throws(
    () => parseUpdatePriceDisplaySettingRequest(body),
    (error: unknown) =>
      error instanceof PriceDisplaySettingError && error.code === 'VALIDATION_FAILED',
  );
}

void describe('Price display-setting contract parsing', () => {
  void test('accepts exactly the canonical units', () => {
    assert.deepEqual(parseUpdatePriceDisplaySettingRequest({ unit: 'RIAL' }), { unit: 'RIAL' });
    assert.deepEqual(parseUpdatePriceDisplaySettingRequest({ unit: 'TOMAN' }), { unit: 'TOMAN' });
  });

  void test('rejects malformed shapes, unknown fields, and non-canonical units', () => {
    for (const body of [
      null,
      [],
      {},
      { unit: null },
      { unit: 1 },
      { unit: 'rial' },
      { unit: 'Toman' },
      { unit: 'USD' },
      { unit: 'RIAL', id: 1 },
    ]) {
      expectValidation(body);
    }
  });
});
