import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  productMainSpecsSchema,
  productSpecificationsSchema,
} from '../features/products/schemas/product-main-spec-schema';

void test('normalizes and validates Product main specification text and uniqueness', () => {
  assert.deepEqual(
    productMainSpecsSchema.parse([{ key: '  جنس   پارچه ', value: ' cotton_100 ' }]),
    [{ key: 'جنس پارچه', value: 'cotton_100' }],
  );

  for (const item of [
    { key: 'الف'.repeat(21), value: 'مقدار' },
    { key: 'عنوان', value: 'الف'.repeat(101) },
    { key: 'وزن:', value: '10' },
    { key: 'عنوان', value: 'آبی/قرمز' },
    { key: 'عنوان', value: 'متن\nجدید' },
    { key: 'عنوان', value: 'ویژگی 😊' },
  ]) {
    assert.equal(productMainSpecsSchema.safeParse([item]).success, false);
  }

  assert.equal(
    productMainSpecsSchema.safeParse([
      { key: 'Material', value: 'Cotton' },
      { key: ' material ', value: 'Linen' },
    ]).success,
    false,
  );
});

void test('applies the shared text validation and the 30-item limit to secondary specifications', () => {
  assert.deepEqual(
    productSpecificationsSchema.parse([{ key: '  کشور   سازنده ', value: ' ایران ' }]),
    [{ key: 'کشور سازنده', value: 'ایران' }],
  );
  assert.equal(
    productSpecificationsSchema.safeParse(
      Array.from({ length: 31 }, (_, index) => ({ key: `ویژگی ${index}`, value: 'مقدار' })),
    ).success,
    false,
  );
});
