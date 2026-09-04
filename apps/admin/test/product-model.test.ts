import assert from 'node:assert/strict';
import test from 'node:test';
import {
  changedProductFields,
  changedVariantFields,
  formatPrice,
  normalizeDescription,
  normalizeSku,
  parseProductListLocation,
  parseQuantityInput,
  priceInputToRial,
  priceRialToInput,
  productVariantMode,
  productListHref,
  withProductListQuery,
} from '../app/catalog/products/product-model';
import type { ProductDetailDto } from '../app/catalog/catalog-contracts';

const CATEGORY_ID = '11111111-1111-4111-8111-111111111111';

void test('canonicalizes allowlisted Product list URL state and drops malformed values', () => {
  const valid = parseProductListLocation({
    page: '2',
    pageSize: '50',
    categoryId: CATEGORY_ID,
    status: 'ACTIVE',
  });
  assert.deepEqual(valid.query, {
    page: 2,
    pageSize: 50,
    categoryId: CATEGORY_ID,
    status: 'ACTIVE',
  });
  assert.equal(
    valid.canonicalHref,
    `/catalog/products?page=2&pageSize=50&categoryId=${CATEGORY_ID}&status=ACTIVE`,
  );
  assert.equal(valid.canonical, true);

  const malformed = parseProductListLocation({
    page: ['2', '3'],
    pageSize: '10',
    categoryId: 'bad',
    status: 'PUBLIC',
    search: 'unsafe',
  });
  assert.deepEqual(malformed.query, { page: 1, pageSize: 25 });
  assert.equal(malformed.canonicalHref, '/catalog/products');
  assert.equal(malformed.canonical, false);
});

void test('creates deterministic Product list hrefs and resets page with filter changes', () => {
  assert.equal(productListHref({ page: 1, pageSize: 25 }), '/catalog/products');
  assert.equal(
    withProductListQuery(
      { page: 4, pageSize: 50, status: 'DRAFT', categoryId: CATEGORY_ID },
      { status: undefined },
      true,
    ),
    `/catalog/products?pageSize=50&categoryId=${CATEGORY_ID}`,
  );
});

void test('normalizes Persian and Arabic digits and converts prices exactly', () => {
  assert.equal(priceInputToRial('۱٬۲۳۰', 'RIAL'), 1230);
  assert.equal(priceInputToRial('١٢٣', 'TOMAN'), 1230);
  assert.equal(priceInputToRial('۱۲۳', 'RIAL'), null);
  assert.equal(priceInputToRial('1.5', 'TOMAN'), null);
  assert.equal(priceInputToRial(String(Number.MAX_SAFE_INTEGER), 'TOMAN'), null);
  assert.equal(formatPrice(12_300, 'TOMAN'), '۱٬۲۳۰ تومان');
});

void test('accepts only bounded absolute initial Inventory quantities', () => {
  assert.equal(parseQuantityInput('۰'), 0);
  assert.equal(parseQuantityInput('۲٬۱۴۷٬۴۸۳٬۶۴۷'), 2_147_483_647);
  assert.equal(parseQuantityInput('-1'), null);
  assert.equal(parseQuantityInput('2147483648'), null);
});

void test('normalizes Product text and SKU without inventing content', () => {
  assert.equal(normalizeSku(' shirt_one '), 'SHIRT_ONE');
  assert.equal(normalizeDescription('  خط اول\r\nخط دوم  '), 'خط اول\nخط دوم');
  assert.equal(normalizeDescription('   '), null);
});

void test('infers fixed Variant mode and emits only normalized changed fields', () => {
  const product: ProductDetailDto = {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'پیراهن',
    description: null,
    category: { id: CATEGORY_ID, name: 'پوشاک' },
    status: 'DRAFT',
    imageVersion: 1,
    variants: [
      {
        id: '33333333-3333-4333-8333-333333333333',
        productId: '22222222-2222-4222-8222-222222222222',
        sku: 'SHIRT-ONE',
        size: null,
        color: null,
        priceRial: 12_300,
        isActive: true,
        inventory: { onHandQuantity: 2, version: 1 },
        createdAt: '2026-09-04T10:00:00.000Z',
        updatedAt: '2026-09-04T10:00:00.000Z',
      },
    ],
    images: [],
    createdAt: '2026-09-04T10:00:00.000Z',
    updatedAt: '2026-09-04T10:00:00.000Z',
  };
  assert.equal(productVariantMode(product), 'default');
  assert.deepEqual(
    changedProductFields(product, {
      name: '  پیراهن  ',
      description: ' توضیح ',
      categoryId: CATEGORY_ID,
    }),
    { description: 'توضیح' },
  );
  assert.deepEqual(
    changedVariantFields(
      product.variants[0]!,
      { sku: 'shirt-one', size: '', color: '', price: '۱٬۲۳۰' },
      'TOMAN',
    ),
    {},
  );
  assert.equal(priceRialToInput(12_300, 'TOMAN'), '1230');
});
