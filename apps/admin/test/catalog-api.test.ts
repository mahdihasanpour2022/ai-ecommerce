import assert from 'node:assert/strict';
import test from 'node:test';
import axios from 'axios';
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import { createCatalogApi } from '../app/catalog/catalog-api';
import { createHttpClient } from '../app/http/http-client';
import { httpFailureChannel } from '../app/http/http-failure-channel';

const CATEGORY_ID = '11111111-1111-4111-8111-111111111111';
const PRODUCT_ID = '22222222-2222-4222-8222-222222222222';
const VARIANT_ID = '33333333-3333-4333-8333-333333333333';
const IMAGE_ID = '44444444-4444-4444-8444-444444444444';
const CREATED_AT = '2026-09-04T08:00:00.000Z';
const UPDATED_AT = '2026-09-04T09:00:00.000Z';

const category = {
  id: CATEGORY_ID,
  name: 'پوشاک',
  parentId: null,
  level: 1,
  children: [],
  createdAt: CREATED_AT,
  updatedAt: UPDATED_AT,
};
const image = {
  id: IMAGE_ID,
  mediaType: 'WEBP',
  byteSize: 1024,
  width: 800,
  height: 1000,
  position: 0,
  createdAt: CREATED_AT,
  updatedAt: UPDATED_AT,
};
const summary = {
  id: PRODUCT_ID,
  name: 'پیراهن نخی',
  category: { id: CATEGORY_ID, name: 'پوشاک' },
  status: 'DRAFT',
  variantCount: 1,
  activeVariantCount: 1,
  mainImage: image,
  minimumPriceRial: 1_000,
  maximumPriceRial: 1_000,
  totalOnHandQuantity: 7,
  createdAt: CREATED_AT,
  updatedAt: UPDATED_AT,
};
const detail = {
  id: PRODUCT_ID,
  name: 'پیراهن نخی',
  description: null,
  category: { id: CATEGORY_ID, name: 'پوشاک' },
  status: 'DRAFT',
  imageVersion: 3,
  variants: [
    {
      id: VARIANT_ID,
      productId: PRODUCT_ID,
      sku: 'SHIRT-ONE',
      size: null,
      color: null,
      priceRial: 1_000,
      isActive: true,
      inventory: { onHandQuantity: 7, version: 4 },
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT,
    },
  ],
  images: [image],
  createdAt: CREATED_AT,
  updatedAt: UPDATED_AT,
};

void test('uses the centralized safe-read policy and preserves exact catalog DTO fields', async () => {
  const calls: InternalAxiosRequestConfig[] = [];
  const adapter: AxiosAdapter = async (config) => {
    calls.push(config);
    const data =
      config.url === '/admin/catalog/categories'
        ? [category]
        : config.url === '/admin/catalog/products'
          ? { items: [summary], page: 2, pageSize: 50, totalItems: 51, totalPages: 2 }
          : config.url === `/admin/catalog/products/${PRODUCT_ID}`
            ? detail
            : { unit: 'TOMAN' };
    return { data, status: 200, statusText: 'OK', headers: {}, config };
  };
  const api = createCatalogApi(
    createHttpClient({ adapter, baseURL: 'https://api.example.com/api/v1' }),
  );

  const categories = await api.categories();
  const products = await api.products({
    page: 2,
    pageSize: 50,
    categoryId: CATEGORY_ID,
    status: 'DRAFT',
  });
  const product = await api.product(PRODUCT_ID);
  const setting = await api.priceDisplaySetting();

  assert.equal(categories[0]?.name, 'پوشاک');
  assert.deepEqual(
    { page: products.page, pageSize: products.pageSize, totalItems: products.totalItems },
    { page: 2, pageSize: 50, totalItems: 51 },
  );
  assert.equal(product.imageVersion, 3);
  assert.equal(product.variants[0]?.inventory.version, 4);
  assert.equal(product.images[0]?.id, IMAGE_ID);
  assert.equal(setting.unit, 'TOMAN');
  assert.equal(calls.length, 4);
  assert.deepEqual(calls[1]?.params, {
    page: 2,
    pageSize: 50,
    categoryId: CATEGORY_ID,
    status: 'DRAFT',
  });
  for (const call of calls) {
    assert.deepEqual(call.authPolicy, {
      csrf: 'omit',
      failure: 'caller',
      refresh: 'eligible',
    });
    assert.equal(call.headers.has('Authorization'), false);
    assert.equal(call.headers.has('X-CSRF-Token'), false);
    assert.equal(call.withCredentials, true);
  }
});

void test('rejects malformed request identifiers and malformed success bodies before use', async () => {
  let calls = 0;
  const adapter: AxiosAdapter = async (config) => {
    calls += 1;
    return {
      data: { items: [], page: 1, pageSize: 25, totalItems: 0, totalPages: '0' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  };
  const api = createCatalogApi(
    createHttpClient({ adapter, baseURL: 'https://api.example.com/api/v1' }),
  );

  await assert.rejects(api.product('not-a-uuid'), { code: 'INVALID_CATALOG_REQUEST' });
  await assert.rejects(api.products({ page: 0 }), { code: 'INVALID_CATALOG_REQUEST' });
  assert.equal(calls, 0);
  await assert.rejects(api.products(), { code: 'INVALID_RESPONSE', status: 502 });
  assert.equal(calls, 1);
});

void test('publishes definitive authentication loss but keeps forbidden catalog failures local', async () => {
  const published: string[] = [];
  const unsubscribe = httpFailureChannel.subscribe((failure) => published.push(failure.code));
  const adapter: AxiosAdapter = async (config) => {
    const code =
      config.url === '/admin/catalog/categories' ? 'ACCOUNT_DISABLED' : 'INSUFFICIENT_PERMISSION';
    const status = code === 'ACCOUNT_DISABLED' ? 401 : 403;
    throw new axios.AxiosError('HTTP failure', 'ERR_BAD_RESPONSE', config, undefined, {
      data: { code },
      status,
      statusText: 'Error',
      headers: {},
      config,
    });
  };
  const api = createCatalogApi(
    createHttpClient({ adapter, baseURL: 'https://api.example.com/api/v1' }),
  );

  try {
    await assert.rejects(api.categories(), { code: 'ACCOUNT_DISABLED' });
    await assert.rejects(api.products(), { code: 'INSUFFICIENT_PERMISSION' });
    assert.deepEqual(published, ['ACCOUNT_DISABLED']);
  } finally {
    unsubscribe();
  }
});
