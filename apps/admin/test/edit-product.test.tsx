import { QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, renderHook, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from 'antd';
import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import type { ReactNode } from 'react';
import { httpClient } from '../app/http/http-client';
import { CATEGORY_OPTIONS_PAGE_SIZE } from '../features/categories/constants/pagination';
import { categoryKeys } from '../features/categories/hooks/useGetCategories';
import type { CategoriesResponse } from '../features/categories/interfaces/category-contract';
import { EditProductModal } from '../features/products/components/edit-product-modal';
import { useEditProductWorkflow } from '../features/products/hooks/useEditProductWorkflow';
import type {
  EditProductWorkflowVariables,
  Product,
  RawProductDetailResponse,
} from '../features/products/interfaces/product-contract';
import { createAdminQueryClient } from '../providers/react-query-provider';
import { installDomEnvironment } from './dom-environment';

const restoreDom = installDomEnvironment();
process.once('beforeExit', restoreDom);
afterEach(() => cleanup());

const productId = '11111111-1111-4111-8111-111111111111';
const categoryId = '22222222-2222-4222-8222-222222222222';
const secondVariantId = '44444444-4444-4444-8444-444444444444';
const timestamp = '2026-09-16T08:00:00.000Z';

const product: Product = {
  id: productId,
  name: 'پیراهن لینن',
  description: 'توضیحات فعلی',
  tag: 'featured_product',
  category: { id: categoryId, name: 'پیراهن' },
  status: 'DRAFT',
  variantCount: 2,
  activeVariantCount: 2,
  sizes: ['medium', 'large'],
  colors: ['blue', 'black'],
  mainImage: null,
  originalPriceRial: 1_200_000,
  finalPriceRial: 1_080_000,
  discountPercent: 10,
  currency: 'IRR',
  totalOnHandQuantity: 20,
  mainSpecs: { جنس: 'نخ' },
  specificationCount: 2,
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
      image: null,
      children: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ],
  singleResult: null,
  details: null,
};

const productDetailResponse: RawProductDetailResponse = {
  statusCode: 200,
  hasError: false,
  message: 'جزئیات محصول دریافت شد.',
  code: 'PRODUCT_FETCHED',
  count: 1,
  result: null,
  singleResult: {
    id: product.id,
    name: product.name,
    description: product.description,
    tag: product.tag,
    originalPriceRial: product.originalPriceRial,
    finalPriceRial: product.finalPriceRial,
    discountPercent: product.discountPercent,
    currency: product.currency,
    category: product.category,
    status: product.status,
    imageVersion: 1,
    specifications: { جنس: 'نخ', 'کشور سازنده': 'ایران' },
    mainSpecs: { جنس: 'نخ' },
    variants: [],
    images: [],
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  },
  details: null,
};

const emptyOptionsResponse = {
  statusCode: 200,
  hasError: false,
  message: 'گزینه‌ها دریافت شدند.',
  code: 'PRODUCT_OPTIONS_FETCHED',
  count: 0,
  result: [],
  singleResult: null,
  details: null,
};

void test('loads Category options when the Product edit modal opens', async () => {
  const originalAdapter = httpClient.defaults.adapter;
  const queryClient = createAdminQueryClient();
  const optionCalls: string[] = [];
  const releases: Array<() => void> = [];
  httpClient.defaults.adapter = async (config) => {
    if (config.url === '/admin/catalog/categories') {
      optionCalls.push(config.url);
      await new Promise<void>((resolve) => releases.push(resolve));
      return { data: categoriesResponse, status: 200, statusText: 'OK', headers: {}, config };
    }
    return {
      data:
        config.url === `/admin/catalog/products/${productId}`
          ? productDetailResponse
          : emptyOptionsResponse,
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  };

  try {
    const screen = render(
      <App>
        <QueryClientProvider client={queryClient}>
          <EditProductModal
            product={product}
            pending={false}
            onCancel={() => undefined}
            onSubmit={() => Promise.resolve()}
          />
        </QueryClientProvider>
      </App>,
    );
    const dialog = await screen.findByRole('dialog', { name: 'ویرایش محصول' });
    await waitFor(() => assert.equal(optionCalls.length, 1));
    assert.deepEqual(optionCalls, ['/admin/catalog/categories']);
    assert.ok(within(dialog).getByRole('textbox', { name: 'نام محصول' }));
    const category = within(dialog).getByRole('combobox', { name: 'دسته‌بندی' });
    assert.equal(category.hasAttribute('disabled'), true);
    assert.equal(category.closest('.ant-select')?.classList.contains('ant-select-loading'), true);

    for (const release of releases) release();
    await waitFor(() => {
      assert.equal(category.hasAttribute('disabled'), false);
    });
  } finally {
    for (const release of releases) release();
    if (originalAdapter === undefined) delete httpClient.defaults.adapter;
    else httpClient.defaults.adapter = originalAdapter;
    queryClient.clear();
    cleanup();
  }
});

void test('renders Product fields and submits only changed Product values', async () => {
  const originalAdapter = httpClient.defaults.adapter;
  const queryClient = createAdminQueryClient();
  queryClient.setQueryData(
    categoryKeys.list({ page: 1, pageSize: CATEGORY_OPTIONS_PAGE_SIZE }),
    categoriesResponse,
  );
  httpClient.defaults.adapter = async (config) => ({
    data:
      config.url === `/admin/catalog/products/${productId}`
        ? productDetailResponse
        : config.url === '/admin/catalog/categories'
          ? categoriesResponse
          : emptyOptionsResponse,
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

    await waitFor(() => {
      assert.equal(
        (within(dialog).getByRole('textbox', { name: 'نام محصول' }) as HTMLInputElement).value,
        product.name,
      );
    });

    assert.ok(within(dialog).getByRole('textbox', { name: 'نام محصول' }));
    assert.ok(within(dialog).getByRole('textbox', { name: 'توضیحات (اختیاری)' }));
    assert.ok(within(dialog).getByRole('combobox', { name: 'دسته‌بندی' }));
    assert.ok(within(dialog).getByRole('textbox', { name: 'قیمت اصلی (ریال)' }));
    assert.ok(within(dialog).getByText('جنس'));
    assert.ok(within(dialog).getByText('کشور سازنده'));

    const name = within(dialog).getByRole('textbox', { name: 'نام محصول' });
    await user.clear(name);
    await user.type(name, 'پیراهن ویرایش‌شده');
    const price = within(dialog).getByRole('textbox', { name: 'قیمت اصلی (ریال)' });
    await user.clear(price);
    await user.type(price, '2400000');
    await user.click(within(dialog).getByRole('button', { name: 'ذخیره تغییرات' }));

    await waitFor(() => assert.ok(submitted));
    assert.equal(submitted?.product?.productId, productId);
    assert.deepEqual(submitted?.product, {
      productId,
      name: 'پیراهن ویرایش‌شده',
      originalPriceRial: 2_400_000,
    });
    assert.equal(submitted?.variant, undefined);
    assert.equal(submitted?.inventory, undefined);
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
    await act(async () => {
      assert.equal(
        await hook.result.current.save({
          product: { productId, name: 'نام جدید', originalPriceRial: 2_400_000 },
          inventory: { variantId: secondVariantId, onHandQuantity: 6, version: 5 },
        }),
        true,
      );
    });

    assert.deepEqual(
      calls.map(({ method, url }) => [method, url]),
      [
        ['patch', `/admin/catalog/products/${productId}`],
        ['put', `/admin/catalog/variants/${secondVariantId}/inventory`],
      ],
    );
    assert.deepEqual(JSON.parse(String(calls[0]?.data)), {
      name: 'نام جدید',
      originalPriceRial: 2_400_000,
    });
    assert.deepEqual(JSON.parse(String(calls[1]?.data)), { onHandQuantity: 6, version: 5 });
    assert.equal(invalidations, 1);
    hook.unmount();
  } finally {
    if (originalAdapter === undefined) delete httpClient.defaults.adapter;
    else httpClient.defaults.adapter = originalAdapter;
    queryClient.clear();
    document.cookie = 'admin_csrf_token=; Path=/; Max-Age=0; SameSite=Strict';
  }
});
