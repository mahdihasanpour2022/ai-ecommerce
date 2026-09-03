import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { describe, test } from 'node:test';

import {
  parseCreateProductRequest,
  parseProductListQuery,
  parseUpdateProductRequest,
  parseUpdateVariantRequest,
} from '../src/catalog/product.dto.js';
import { ProductError } from '../src/catalog/product.errors.js';

function expectCode(work: () => unknown, code: string): void {
  assert.throws(work, (error: unknown) => error instanceof ProductError && error.code === code);
}

void describe('Product and Variant contract parsing', () => {
  void test('normalizes Product text, SKU, labels, and canonical numeric values', () => {
    const categoryId = randomUUID();
    const parsed = parseCreateProductRequest({
      name: '  پیراهن   نخی  ',
      description: '  توضیح خط اول\r\nتوضیح خط دوم  ',
      categoryId,
      variants: [
        {
          sku: ' shirt-black-m ',
          size: '  Ｍ ',
          color: '  مشکی  ',
          priceRial: 120_000,
        },
      ],
    });
    assert.equal(parsed.name, 'پیراهن نخی');
    assert.equal(parsed.description, 'توضیح خط اول\nتوضیح خط دوم');
    assert.equal(parsed.variants[0]?.sku, 'SHIRT-BLACK-M');
    assert.equal(parsed.variants[0]?.size, 'M');
    assert.equal(parsed.variants[0]?.isActive, true);
    assert.equal(parsed.variants[0]?.onHandQuantity, 0);
    assert.equal(parsed.variants[0]?.priceRial, 120_000n);
  });

  void test('parses only bounded allowlisted Product list query values', () => {
    assert.deepEqual(parseProductListQuery({}), { page: 1, pageSize: 25 });
    assert.deepEqual(parseProductListQuery({ page: '2', pageSize: '100', status: 'ACTIVE' }), {
      page: 2,
      pageSize: 100,
      status: 'ACTIVE',
    });
    expectCode(() => parseProductListQuery({ pageSize: '101' }), 'VALIDATION_FAILED');
    expectCode(() => parseProductListQuery({ page: '01' }), 'VALIDATION_FAILED');
    expectCode(() => parseProductListQuery({ page: '2147483648' }), 'VALIDATION_FAILED');
    expectCode(() => parseProductListQuery({ sort: 'name' }), 'VALIDATION_FAILED');
  });

  void test('rejects ambiguous nullable fields, unsafe prices, markup, and empty patches', () => {
    const categoryId = randomUUID();
    expectCode(
      () =>
        parseCreateProductRequest({
          name: 'Product',
          description: '<b>markup</b>',
          categoryId,
          variants: [{ sku: 'SKU-1', priceRial: 1000 }],
        }),
      'VALIDATION_FAILED',
    );
    expectCode(
      () =>
        parseCreateProductRequest({
          name: 'Product',
          categoryId,
          variants: [{ sku: 'SKU-1', size: '', priceRial: 1000 }],
        }),
      'VALIDATION_FAILED',
    );
    expectCode(
      () =>
        parseCreateProductRequest({
          name: 'Product',
          categoryId,
          variants: [{ sku: 'SKU-1', priceRial: 1001 }],
        }),
      'VALIDATION_FAILED',
    );
    expectCode(() => parseUpdateProductRequest({}), 'VALIDATION_FAILED');
    expectCode(() => parseUpdateVariantRequest({ onHandQuantity: 2 }), 'VALIDATION_FAILED');
  });
});
