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
import { generateVariantSku } from '../src/catalog/product.service.js';

function expectCode(work: () => unknown, code: string): void {
  assert.throws(work, (error: unknown) => error instanceof ProductError && error.code === code);
}

void describe('Product and Variant contract parsing', () => {
  void test('generates opaque unique SKU values for initial Product variants', () => {
    const first = generateVariantSku();
    const second = generateVariantSku();
    assert.match(first, /^SKU-[0-9A-F]{32}$/u);
    assert.match(second, /^SKU-[0-9A-F]{32}$/u);
    assert.notEqual(first, second);
  });

  void test('normalizes Product text, labels, and canonical numeric values', () => {
    const categoryId = randomUUID();
    const parsed = parseCreateProductRequest({
      name: '  پیراهن   نخی  ',
      description: '  توضیح خط اول\r\nتوضیح خط دوم  ',
      categoryId,
      variants: [
        {
          size: '  Ｍ ',
          color: '  مشکی  ',
          priceRial: 120_000,
          onHandQuantity: 5,
        },
      ],
    });
    assert.equal(parsed.name, 'پیراهن نخی');
    assert.equal(parsed.description, 'توضیح خط اول\nتوضیح خط دوم');
    assert.equal(parsed.variants[0]?.size, 'M');
    assert.equal(parsed.variants[0]?.isActive, true);
    assert.equal(parsed.variants[0]?.onHandQuantity, 5);
    assert.equal(parsed.variants[0]?.priceRial, 120_000n);
  });

  void test('parses only bounded allowlisted Product list query values', () => {
    assert.deepEqual(parseProductListQuery({}), { page: 1, pageSize: 25 });
    assert.deepEqual(parseProductListQuery({ page: '2', pageSize: '100', status: 'ACTIVE' }), {
      page: 2,
      pageSize: 100,
      status: 'ACTIVE',
    });
    assert.deepEqual(
      parseProductListQuery({
        name: '  Cotton   Shirt ',
        size: '  Ｍ ',
        color: ' Black ',
        availability: 'IN_STOCK',
        createdFrom: '2026-09-01T08:15:20.000Z',
        createdTo: '2026-09-20T18:30:40.000Z',
        minimumPriceRial: '1000',
        maximumPriceRial: '2000',
      }),
      {
        page: 1,
        pageSize: 25,
        name: 'Cotton Shirt',
        sizeKey: 'm',
        colorKey: 'black',
        availability: 'IN_STOCK',
        createdFrom: new Date('2026-09-01T08:15:20.000Z'),
        createdToExclusive: new Date('2026-09-20T18:30:41.000Z'),
        minimumPriceRial: 1000n,
        maximumPriceRial: 2000n,
      },
    );
    expectCode(() => parseProductListQuery({ pageSize: '101' }), 'VALIDATION_FAILED');
    expectCode(() => parseProductListQuery({ page: '01' }), 'VALIDATION_FAILED');
    expectCode(() => parseProductListQuery({ page: '2147483648' }), 'VALIDATION_FAILED');
    expectCode(() => parseProductListQuery({ sort: 'name' }), 'VALIDATION_FAILED');
    expectCode(
      () => parseProductListQuery({
        createdFrom: '2026-09-21T00:00:00.000Z',
        createdTo: '2026-09-20T23:59:59.000Z',
      }),
      'VALIDATION_FAILED',
    );
    expectCode(() => parseProductListQuery({ createdFrom: '2026-09-20' }), 'VALIDATION_FAILED');
    expectCode(
      () => parseProductListQuery({ minimumPriceRial: '2000', maximumPriceRial: '1000' }),
      'VALIDATION_FAILED',
    );
  });

  void test('rejects ambiguous nullable fields, unsafe prices, markup, and empty patches', () => {
    const categoryId = randomUUID();
    expectCode(
      () =>
        parseCreateProductRequest({
          name: 'Product',
          description: '<b>markup</b>',
          categoryId,
          variants: [{ priceRial: 1000, onHandQuantity: 1 }],
        }),
      'VALIDATION_FAILED',
    );
    expectCode(
      () =>
        parseCreateProductRequest({
          name: 'Product',
          description: 'a'.repeat(201),
          categoryId,
          variants: [{ priceRial: 1000, onHandQuantity: 1 }],
        }),
      'VALIDATION_FAILED',
    );
    expectCode(
      () =>
        parseCreateProductRequest({
          name: 'Product',
          categoryId,
          variants: [{ size: '', priceRial: 1000, onHandQuantity: 1 }],
        }),
      'VALIDATION_FAILED',
    );
    expectCode(
      () =>
        parseCreateProductRequest({
          name: 'Product',
          categoryId,
          variants: [{ priceRial: 1001, onHandQuantity: 1 }],
        }),
      'VALIDATION_FAILED',
    );
    expectCode(() => parseUpdateProductRequest({}), 'VALIDATION_FAILED');
    expectCode(() => parseUpdateVariantRequest({ onHandQuantity: 2 }), 'VALIDATION_FAILED');
    expectCode(
      () =>
        parseCreateProductRequest({
          name: 'Product',
          categoryId,
          variants: [{ sku: 'CLIENT-SKU', priceRial: 1000, onHandQuantity: 1 }],
        }),
      'VALIDATION_FAILED',
    );
    expectCode(
      () =>
        parseCreateProductRequest({
          name: 'Product',
          categoryId,
          variants: [{ priceRial: 1000, onHandQuantity: 0 }],
        }),
      'VALIDATION_FAILED',
    );
  });
});
