import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';

import type { ProductRepository } from '../src/catalog/product.repository.js';
import type { ProductImageStorage } from '../src/catalog/product-image.storage.js';
import { ProductService } from '../src/catalog/product.service.js';

void test('maps description and unique size/color labels into protected Product summaries', async () => {
  const now = new Date('2026-09-19T08:00:00.000Z');
  const repository = {
    list: () =>
      Promise.resolve({
        categoryExists: true,
        totalItems: 1,
        rows: [
          {
            id: randomUUID(),
            name: 'پیراهن لینن',
            description: 'پیراهن سبک مناسب تابستان',
            category: { id: randomUUID(), name: 'پیراهن' },
            status: 'DRAFT',
            variants: [
              {
                size: 'M',
                color: 'مشکی',
                priceRial: 1_200_000n,
                isActive: true,
                inventory: { onHandQuantity: 4 },
              },
              {
                size: 'L',
                color: 'مشکی',
                priceRial: 1_400_000n,
                isActive: true,
                inventory: { onHandQuantity: 2 },
              },
              {
                size: null,
                color: null,
                priceRial: 1_300_000n,
                isActive: false,
                inventory: { onHandQuantity: 1 },
              },
            ],
            images: [],
            createdAt: now,
            updatedAt: now,
          },
        ],
      }),
  } as unknown as ProductRepository;

  const imageStorage = {} as ProductImageStorage;
  const result = await new ProductService(repository, imageStorage).list({ page: 1, pageSize: 25 });

  assert.equal(result.items[0]?.description, 'پیراهن سبک مناسب تابستان');
  assert.deepEqual(result.items[0]?.sizes, ['M', 'L']);
  assert.deepEqual(result.items[0]?.colors, ['مشکی']);
  assert.equal(result.items[0]?.variantCount, 3);
  assert.equal(result.items[0]?.totalOnHandQuantity, 7);
});
