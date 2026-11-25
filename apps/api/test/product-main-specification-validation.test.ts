import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { parseCreateProductRequest } from '../src/catalog/product.dto.js';
import { ProductError } from '../src/catalog/product.errors.js';

const base = {
  name: 'Product',
  originalPriceRial: 1000,
  discountPercent: 0,
  categoryId: randomUUID(),
  variants: [{ size: 'M', color: 'Black', onHandQuantity: 1 }],
};

void test('enforces normalized allowlisted 20/100 Product specification text', () => {
  const parsed = parseCreateProductRequest({
    ...base,
    specifications: [{ title: '  جنس   پارچه ', description: ' cotton_100 ' }],
    mainSpecs: [{ title: 'جنس پارچه', description: 'cotton_100' }],
  });
  assert.deepEqual(parsed.mainSpecs, { 'جنس پارچه': 'cotton_100' });

  for (const specification of [
    { title: 'الف'.repeat(21), description: 'مقدار' },
    { title: 'عنوان', description: 'الف'.repeat(101) },
    { title: 'وزن:', description: '10' },
    { title: 'عنوان', description: 'آبی/قرمز' },
    { title: 'عنوان', description: 'ویژگی 😊' },
  ]) {
    assert.throws(
      () => parseCreateProductRequest({ ...base, specifications: [specification] }),
      (error: unknown) => error instanceof ProductError && error.code === 'VALIDATION_FAILED',
    );
  }
});
