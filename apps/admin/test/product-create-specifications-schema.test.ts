import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createProductSchema } from '../features/products/schemas/create-product-schema';

const image = {
  name: 'product.png',
  size: 1,
  type: 'image/png',
  arrayBuffer: async () => new ArrayBuffer(1),
} as unknown as File;

const validProduct = {
  name: 'پیراهن',
  description: '',
  tag: '',
  categoryId: '123e4567-e89b-12d3-a456-426614174000',
  variants: [{ image, size: 'medium', color: 'blue', onHandQuantity: '1' }],
  mainSpecs: [{ key: 'جنس', value: 'نخ' }],
  specifications: [{ key: 'کشور سازنده', value: 'ایران' }],
  originalPriceRial: '1000',
  discountPercent: '0',
};

void test('accepts secondary specifications and rejects duplicate or excessive combined keys', () => {
  assert.equal(createProductSchema.safeParse(validProduct).success, true);
  assert.equal(
    createProductSchema.safeParse({
      ...validProduct,
      specifications: [{ key: ' جنس ', value: 'کتان' }],
    }).success,
    false,
  );
  assert.equal(
    createProductSchema.safeParse({
      ...validProduct,
      specifications: Array.from({ length: 30 }, (_, index) => ({
        key: `ویژگی ${index}`,
        value: 'مقدار',
      })),
    }).success,
    false,
  );
});
