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
    specifications: { '  جنس   پارچه ': ' cotton_100 ' },
    mainSpecs: { 'جنس پارچه': 'cotton_100' },
  });
  assert.deepEqual(parsed.mainSpecs, { 'جنس پارچه': 'cotton_100' });

  for (const specifications of [
    { ['الف'.repeat(21)]: 'مقدار' },
    { عنوان: 'الف'.repeat(101) },
    { 'وزن:': '10' },
    { عنوان: 'آبی/قرمز' },
    { عنوان: 'ویژگی 😊' },
  ]) {
    assert.throws(
      () => parseCreateProductRequest({ ...base, specifications }),
      (error: unknown) => error instanceof ProductError && error.code === 'VALIDATION_FAILED',
    );
  }
});
