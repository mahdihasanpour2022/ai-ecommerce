import assert from 'node:assert/strict';
import { test } from 'node:test';
import { editProductSchema } from '../features/products/schemas/edit-product-schema';

const validProduct = {
  name: 'پیراهن',
  description: '',
  tag: '',
  categoryId: '123e4567-e89b-12d3-a456-426614174000',
  mainSpecs: [{ key: 'جنس', value: 'نخ' }],
  specifications: [{ key: 'کشور سازنده', value: 'ایران' }],
  originalPriceRial: '1000',
  discountPercent: '0',
};

void test('validates main and secondary specifications in the Product edit form', () => {
  assert.equal(editProductSchema.safeParse(validProduct).success, true);
  assert.equal(
    editProductSchema.safeParse({
      ...validProduct,
      specifications: [{ key: ' جنس ', value: 'کتان' }],
    }).success,
    false,
  );
  assert.equal(
    editProductSchema.safeParse({
      ...validProduct,
      specifications: Array.from({ length: 30 }, (_, index) => ({
        key: `ویژگی ${index}`,
        value: 'مقدار',
      })),
    }).success,
    false,
  );
});
