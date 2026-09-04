import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { InventoryError } from '../src/catalog/inventory.errors.js';
import { InventoryRepository } from '../src/catalog/inventory.repository.js';
import { InventoryService } from '../src/catalog/inventory.service.js';

interface Scenario {
  readonly productId?: string;
  readonly status?: string;
  readonly updated?: { readonly onHandQuantity: number; readonly version: number };
  readonly inventoryExists?: boolean;
}

function serviceFor(scenario: Scenario): InventoryService {
  const repository = {
    transaction: async <T>(work: (transaction: never) => Promise<T>): Promise<T> =>
      work({} as never),
    owningProductId: () => Promise.resolve(scenario.productId),
    lockProductStatus: () => Promise.resolve(scenario.status),
    update: () => Promise.resolve(scenario.updated),
    inventoryExists: () => Promise.resolve(scenario.inventoryExists ?? false),
  } as unknown as InventoryRepository;
  return new InventoryService(repository);
}

async function expectCode(work: Promise<unknown>, code: string): Promise<void> {
  await assert.rejects(
    work,
    (error: unknown) => error instanceof InventoryError && error.code === code,
  );
}

void describe('Inventory mutation classification', () => {
  void test('returns only the updated quantity and version', async () => {
    const result = await serviceFor({
      productId: 'product',
      status: 'DRAFT',
      updated: { onHandQuantity: 8, version: 2 },
    }).update('variant', { onHandQuantity: 8, version: 1 });
    assert.deepEqual(result, { onHandQuantity: 8, version: 2 });
  });

  void test('distinguishes missing Variant or Inventory from a stale version', async () => {
    await expectCode(
      serviceFor({}).update('variant', { onHandQuantity: 1, version: 1 }),
      'PRODUCT_VARIANT_NOT_FOUND',
    );
    await expectCode(
      serviceFor({ productId: 'product', status: 'DRAFT', inventoryExists: false }).update(
        'variant',
        { onHandQuantity: 1, version: 1 },
      ),
      'PRODUCT_VARIANT_NOT_FOUND',
    );
    await expectCode(
      serviceFor({ productId: 'product', status: 'DRAFT', inventoryExists: true }).update(
        'variant',
        { onHandQuantity: 1, version: 1 },
      ),
      'INVENTORY_VERSION_CONFLICT',
    );
  });

  void test('rejects Archived Product Inventory mutation before update', async () => {
    await expectCode(
      serviceFor({ productId: 'product', status: 'ARCHIVED' }).update('variant', {
        onHandQuantity: 1,
        version: 1,
      }),
      'PRODUCT_LIFECYCLE_CONFLICT',
    );
  });
});
