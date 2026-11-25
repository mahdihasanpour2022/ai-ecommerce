import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ProductResponse } from '../features/products/product/hooks/useGetProductById';

void test('uses array-shaped Product specifications from the Backend contract', () => {
  const response = {
    statusCode: 200,
    hasError: false,
    message: 'محصول دریافت شد.',
    code: 'PRODUCT_FETCHED',
    count: 1,
    result: null,
    singleResult: {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'پیراهن',
      description: 'توضیحات',
      category: { id: '22222222-2222-4222-8222-222222222222', name: 'پیراهن' },
      image: '',
      alt: '',
      original_price: 1_000,
      final_price: 1_000,
      discount: 0,
      currency: 'IRR',
      quantity: 1,
      isAvailable: true,
      isFavorite: false,
      specifications: [
        { title: 'جنس', description: 'کتان' },
        { title: 'کشور سازنده', description: 'ایران' },
      ],
      mainSpecs: [
        { title: 'جنس', description: 'کتان' },
        { title: 'پلی استر', description: '10 درصد' },
      ],
      categoryPath: [],
      variants: [],
    },
    details: null,
  } as const satisfies ProductResponse;

  assert.deepEqual(response.singleResult.mainSpecs, [
    { title: 'جنس', description: 'کتان' },
    { title: 'پلی استر', description: '10 درصد' },
  ]);
});
