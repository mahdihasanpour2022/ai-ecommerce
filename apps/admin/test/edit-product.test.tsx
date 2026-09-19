import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { App } from 'antd';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { httpClient } from '../app/http/http-client';
import { createAdminQueryClient } from '../app/react-query-provider';
import { CATEGORY_OPTIONS_PAGE_SIZE } from '../features/categories/constants/pagination';
import { categoryKeys } from '../features/categories/hooks/useGetCategories';
import type { CategoriesResponse } from '../features/categories/interfaces/category-contract';
import { EditProductModal } from '../features/products/components/edit-product-modal';
import { useEditProductWorkflow } from '../features/products/hooks/useEditProductWorkflow';
import { productKeys } from '../features/products/hooks/useGetProducts';
import { productOptionKeys } from '../features/products/hooks/useGetProductOptions';
import type {
  ProductColorsResponse,
  ProductSizesResponse,
} from '../features/products/interfaces/product-option-contract';
import type {
  EditProductWorkflowVariables,
  Product,
  ProductDetail,
  ProductDetailResponse,
} from '../features/products/interfaces/product-contract';
import { installDomEnvironment } from './dom-environment';

const restoreDom = installDomEnvironment();
process.once('beforeExit', restoreDom);
afterEach(() => cleanup());

const productId = '11111111-1111-4111-8111-111111111111';
const categoryId = '22222222-2222-4222-8222-222222222222';
const firstVariantId = '33333333-3333-4333-8333-333333333333';
const secondVariantId = '44444444-4444-4444-8444-444444444444';
const imageId = '55555555-5555-4555-8555-555555555555';
const timestamp = '2026-09-16T08:00:00.000Z';

const product: Product = {
  id: productId,
  name: 'پیراهن لینن',
  description: 'توضیحات فعلی',
  category: { id: categoryId, name: 'پیراهن' },
  status: 'DRAFT',
  variantCount: 2,
  activeVariantCount: 2,
  sizes: ['medium', 'large'],
  colors: ['blue', 'black'],
  mainImage: null,
  minimumPriceRial: 1_200_000,
  maximumPriceRial: 2_000_000,
  totalOnHandQuantity: 20,
  createdAt: timestamp,
  updatedAt: timestamp,
};

const detail: ProductDetail = {
  id: productId,
  name: product.name,
  description: 'توضیحات فعلی',
  category: product.category,
  status: 'DRAFT',
  imageVersion: 3,
  variants: [
    {
      id: firstVariantId,
      productId,
      sku: 'SKU-FIRST',
      size: 'medium',
      color: 'blue',
      priceRial: 1_200_000,
      isActive: true,
      inventory: { onHandQuantity: 12, version: 2 },
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: secondVariantId,
      productId,
      sku: 'SKU-SECOND',
      size: 'large',
      color: 'red',
      priceRial: 2_000_000,
      isActive: true,
      inventory: { onHandQuantity: 8, version: 5 },
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ],
  images: [
    {
      id: imageId,
      mediaType: 'WEBP',
      byteSize: 2048,
      width: 1200,
      height: 800,
      position: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ],
  createdAt: timestamp,
  updatedAt: timestamp,
};

const categoriesResponse: CategoriesResponse = {
  statusCode: 200,
  hasError: false,
  message: 'دسته‌بندی‌ها دریافت شدند.',
  code: 'CATEGORIES_FETCHED',
  count: 1,
  result: [
    {
      ...product.category,
      parentId: null,
      level: 1,
      children: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ],
  singleResult: null,
  details: null,
};

const sizesResponse: ProductSizesResponse = {
  statusCode: 200,
  hasError: false,
  message: 'سایزها دریافت شدند.',
  code: 'PRODUCT_SIZES_FETCHED',
  count: 3,
  result: ['small', 'medium', 'large'],
  singleResult: null,
  details: null,
};

const colorsResponse: ProductColorsResponse = {
  statusCode: 200,
  hasError: false,
  message: 'رنگ‌ها دریافت شدند.',
  code: 'PRODUCT_COLORS_FETCHED',
  count: 3,
  result: [
    { 'color-name': 'blue', 'hex-code': '#2563EB' },
    { 'color-name': 'red', 'hex-code': '#DC2626' },
    { 'color-name': 'green', 'hex-code': '#16A34A' },
  ],
  singleResult: null,
  details: null,
};

function validProductImage(): File {
  return new File(
    [
      new Uint8Array([
        137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
      ]),
    ],
    'replacement.png',
    { type: 'image/png' },
  );
}

void test('renders every create field, selects a Variant, and submits only changed values', async () => {
  const originalAdapter = httpClient.defaults.adapter;
  const queryClient = createAdminQueryClient();
  const detailResponse: ProductDetailResponse = {
    statusCode: 200,
    hasError: false,
    message: 'محصول دریافت شد.',
    code: 'PRODUCT_FETCHED',
    count: 1,
    result: null,
    singleResult: detail,
    details: null,
  };
  queryClient.setQueryData(productKeys.detail(productId), detailResponse);
  queryClient.setQueryData(
    categoryKeys.list({ page: 1, pageSize: CATEGORY_OPTIONS_PAGE_SIZE }),
    categoriesResponse,
  );
  queryClient.setQueryData(productOptionKeys.sizes, sizesResponse);
  queryClient.setQueryData(productOptionKeys.colors, colorsResponse);
  httpClient.defaults.adapter = async (config) => ({
    data: detailResponse,
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  });
  let submitted: EditProductWorkflowVariables | undefined;

  try {
    const screen = render(
      <App message={{ duration: 0.01 }}>
        <QueryClientProvider client={queryClient}>
          <EditProductModal
            product={product}
            pending={false}
            onCancel={() => undefined}
            onSubmit={(variables) => {
              submitted = variables;
              return Promise.resolve();
            }}
          />
        </QueryClientProvider>
      </App>,
    );
    const dialog = await screen.findByRole('dialog', { name: 'ویرایش محصول' });
    const user = userEvent.setup({ document: globalThis.document });

    assert.ok(await within(dialog).findByLabelText('تصویر جدید (اختیاری)'));
    assert.ok(within(dialog).getByRole('textbox', { name: 'نام محصول' }));
    assert.ok(within(dialog).getByRole('textbox', { name: 'توضیحات (اختیاری)' }));
    assert.ok(within(dialog).getByRole('combobox', { name: 'دسته‌بندی' }));
    assert.ok(within(dialog).getByRole('combobox', { name: 'انتخاب تنوع' }));
    assert.ok(within(dialog).getByRole('textbox', { name: 'قیمت (ریال)' }));
    assert.ok(within(dialog).getByRole('combobox', { name: 'سایز' }));
    assert.ok(within(dialog).getByRole('combobox', { name: 'رنگ' }));
    assert.ok(within(dialog).getByRole('spinbutton', { name: 'موجودی' }));

    await user.click(within(dialog).getByRole('combobox', { name: 'انتخاب تنوع' }));
    await user.click(await within(document.body).findByText(/SKU-SECOND/));
    const name = within(dialog).getByRole('textbox', { name: 'نام محصول' });
    await user.clear(name);
    await user.type(name, 'پیراهن ویرایش‌شده');
    const price = within(dialog).getByRole('textbox', { name: 'قیمت (ریال)' });
    await user.clear(price);
    await user.type(price, '2400000');
    const quantity = within(dialog).getByRole('spinbutton', { name: 'موجودی' });
    await user.clear(quantity);
    await user.type(quantity, '6');
    fireEvent.change(within(dialog).getByLabelText('تصویر جدید (اختیاری)'), {
      target: { files: [validProductImage()] },
    });
    await user.click(within(dialog).getByRole('button', { name: 'ذخیره تغییرات' }));

    await waitFor(() => assert.ok(submitted));
    assert.equal(submitted?.product?.productId, productId);
    assert.deepEqual(submitted?.product, { productId, name: 'پیراهن ویرایش‌شده' });
    assert.deepEqual(submitted?.variant, { variantId: secondVariantId, priceRial: 2_400_000 });
    assert.deepEqual(submitted?.inventory, {
      variantId: secondVariantId,
      onHandQuantity: 6,
      version: 5,
    });
    assert.equal(submitted?.image?.currentImageId, imageId);
    assert.equal(submitted?.image?.imageVersion, 3);
  } finally {
    if (originalAdapter === undefined) delete httpClient.defaults.adapter;
    else httpClient.defaults.adapter = originalAdapter;
    queryClient.clear();
  }
});

void test('coordinates only supplied edit mutations and invalidates Product data once', async () => {
  const originalAdapter = httpClient.defaults.adapter;
  const calls: Array<{
    readonly method: string | undefined;
    readonly url: string | undefined;
    readonly data: unknown;
  }> = [];
  httpClient.defaults.adapter = async (config) => {
    calls.push({ method: config.method, url: config.url, data: config.data });
    return {
      data: {
        statusCode: 200,
        hasError: false,
        message: 'تغییرات ذخیره شد.',
        code: 'PRODUCT_UPDATED',
        count: 1,
        result: null,
        singleResult: {},
        details: null,
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  };
  document.cookie = 'admin_csrf_token=test-token; Path=/; SameSite=Strict';
  const queryClient = createAdminQueryClient();
  let invalidations = 0;
  const invalidateQueries = queryClient.invalidateQueries.bind(queryClient);
  queryClient.invalidateQueries = ((filters, options) => {
    invalidations += 1;
    return invalidateQueries(filters, options);
  }) as typeof queryClient.invalidateQueries;
  const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  try {
    const hook = renderHook(() => useEditProductWorkflow(), { wrapper });
    const file = validProductImage();
    await act(async () => {
      assert.equal(
        await hook.result.current.save({
          product: { productId, name: 'نام جدید' },
          variant: { variantId: secondVariantId, priceRial: 2_400_000 },
          inventory: { variantId: secondVariantId, onHandQuantity: 6, version: 5 },
          image: { productId, currentImageId: imageId, imageVersion: 3, file },
        }),
        true,
      );
    });

    assert.deepEqual(
      calls.map(({ method, url }) => [method, url]),
      [
        ['patch', `/admin/catalog/products/${productId}`],
        ['patch', `/admin/catalog/variants/${secondVariantId}`],
        ['put', `/admin/catalog/variants/${secondVariantId}/inventory`],
        ['post', `/admin/catalog/product-images/${imageId}/replacements`],
      ],
    );
    assert.deepEqual(JSON.parse(String(calls[0]?.data)), { name: 'نام جدید' });
    assert.deepEqual(JSON.parse(String(calls[1]?.data)), { priceRial: 2_400_000 });
    assert.deepEqual(JSON.parse(String(calls[2]?.data)), { onHandQuantity: 6, version: 5 });
    assert.ok(calls[3]?.data instanceof FormData);
    assert.equal(invalidations, 1);
    hook.unmount();
  } finally {
    if (originalAdapter === undefined) delete httpClient.defaults.adapter;
    else httpClient.defaults.adapter = originalAdapter;
    queryClient.clear();
    document.cookie = 'admin_csrf_token=; Path=/; Max-Age=0; SameSite=Strict';
  }
});
