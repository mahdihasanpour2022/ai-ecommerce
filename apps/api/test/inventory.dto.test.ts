import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { parseUpdateInventoryRequest } from '../src/catalog/inventory.dto.js';
import { InventoryError } from '../src/catalog/inventory.errors.js';

function expectValidation(body: unknown): void {
  assert.throws(
    () => parseUpdateInventoryRequest(body),
    (error: unknown) => error instanceof InventoryError && error.code === 'VALIDATION_FAILED',
  );
}

void describe('Inventory contract parsing', () => {
  void test('accepts exact integer boundaries', () => {
    assert.deepEqual(parseUpdateInventoryRequest({ onHandQuantity: 0, version: 1 }), {
      onHandQuantity: 0,
      version: 1,
    });
    assert.deepEqual(
      parseUpdateInventoryRequest({
        onHandQuantity: 2_147_483_647,
        version: 2_147_483_647,
      }),
      { onHandQuantity: 2_147_483_647, version: 2_147_483_647 },
    );
  });

  void test('rejects malformed shapes, unknown fields, and invalid numeric values', () => {
    for (const body of [
      null,
      [],
      {},
      { onHandQuantity: 0 },
      { onHandQuantity: 0, version: 1, extra: true },
      { onHandQuantity: -1, version: 1 },
      { onHandQuantity: 1.5, version: 1 },
      { onHandQuantity: '1', version: 1 },
      { onHandQuantity: true, version: 1 },
      { onHandQuantity: 2_147_483_648, version: 1 },
      { onHandQuantity: 0, version: 0 },
      { onHandQuantity: 0, version: 1.5 },
      { onHandQuantity: 0, version: '1' },
      { onHandQuantity: 0, version: 2_147_483_648 },
    ]) {
      expectValidation(body);
    }
  });
});
