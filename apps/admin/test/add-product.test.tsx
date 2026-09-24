import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import axios from 'axios';
import { App } from 'antd';
import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { httpClient } from '../app/http/http-client';
import { createAdminQueryClient } from '../app/react-query-provider';
import AddProduct from '../features/products/components/add-product';
import { CATEGORY_OPTIONS_PAGE_SIZE } from '../features/categories/constants/pagination';
import { categoryKeys } from '../features/categories/hooks/useGetCategories';
import type { CategoriesResponse } from '../features/categories/interfaces/category-contract';
import { productOptionKeys } from '../features/products/hooks/useGetProductOptions';
import type {
  ProductColorsResponse,
  ProductSizesResponse,
} from '../features/products/interfaces/product-option-contract';
import { createProductSchema } from '../features/products/schemas/create-product-schema';
import { formatPriceInput, normalizePriceInput } from '../utils/price-input';
import { installDomEnvironment } from './dom-environment';

const restoreDom = installDomEnvironment();
process.once('beforeExit', restoreDom);
afterEach(() => cleanup());

const categoryId = '10000000-0000-4000-8000-000000000001';
const productId = '20000000-0000-4000-8000-000000000001';

function validProductImage(): File {
  return new File(
    [
      new Uint8Array([
        137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
      ]),
    ],
    'product.png',
    { type: 'image/png' },
  );
}
const categoriesResponse: CategoriesResponse = {
  statusCode: 200,
  hasError: false,
  message: 'دسته‌بندی‌ها دریافت شدند.',
  code: 'CATEGORIES_FETCHED',
  count: 1,
  result: [
    {
      id: categoryId,
      name: 'پیراهن',
      parentId: null,
      level: 1,
      image: null,
      children: [],
      createdAt: '2026-09-16T08:00:00.000Z',
      updatedAt: '2026-09-16T08:00:00.000Z',
    },
  ],
  singleResult: null,
  details: null,
};

const sizesResponse: ProductSizesResponse = {
  statusCode: 200,
  hasError: false,
  message: 'سایزهای محصول دریافت شدند.',
  code: 'PRODUCT_SIZES_FETCHED',
  count: 6,
  result: ['small', 'medium', 'large', 'x-large', '2x-large', '3x-large'],
  singleResult: null,
  details: null,
};

const colorsResponse: ProductColorsResponse = {
  statusCode: 200,
  hasError: false,
  message: 'رنگ‌های محصول دریافت شدند.',
  code: 'PRODUCT_COLORS_FETCHED',
  count: 5,
  result: [
    { 'color-name': 'blue', 'hex-code': '#2563EB' },
    { 'color-name': 'red', 'hex-code': '#DC2626' },
    { 'color-name': 'green', 'hex-code': '#16A34A' },
    { 'color-name': 'white', 'hex-code': '#FFFFFF' },
    { 'color-name': 'black', 'hex-code': '#111827' },
  ],
  singleResult: null,
  details: null,
};

void test('validates Product fields against the Backend boundaries', () => {
  const valid = {
    image: validProductImage(),
    name: ' پیراهن لینن ',
    description: '',
    categoryId,
    size: 'medium',
    color: 'blue',
    priceRial: '1200000',
    onHandQuantity: '12',
  };
  assert.deepEqual(createProductSchema.parse(valid), {
    ...valid,
    name: 'پیراهن لینن',
  });
  assert.equal(createProductSchema.safeParse({ ...valid, priceRial: '12.5' }).success, false);
  assert.equal(createProductSchema.safeParse({ ...valid, categoryId: 'invalid' }).success, false);
  assert.equal(createProductSchema.safeParse({ ...valid, size: '' }).success, false);
  assert.equal(createProductSchema.safeParse({ ...valid, color: '' }).success, false);
  assert.equal(createProductSchema.safeParse({ ...valid, onHandQuantity: '' }).success, false);
  assert.equal(createProductSchema.safeParse({ ...valid, onHandQuantity: '0' }).success, false);
  assert.equal(
    createProductSchema.safeParse({ ...valid, description: 'ت'.repeat(201) }).success,
    false,
  );
  assert.equal(formatPriceInput('1200000'), '1,200,000');
  assert.equal(normalizePriceInput('1,200,000'), '1200000');
  assert.equal(formatPriceInput('۱٬۲۰۰٬۰۰۰ ریال'), '1,200,000');
  assert.equal(normalizePriceInput('١٬٢٠٠٬٠٠٠'), '1200000');
});

async function completeRequiredFields(dialog: HTMLElement) {
  const user = userEvent.setup({ document: globalThis.document });
  await user.type(within(dialog).getByRole('textbox', { name: 'نام محصول' }), 'پیراهن لینن');
  await user.click(within(dialog).getByRole('combobox', { name: 'دسته‌بندی' }));
  await user.click(await within(document.body).findByText('پیراهن'));
  const price = within(dialog).getByRole('textbox', { name: 'قیمت (ریال)' });
  await user.type(price, '1200000');
  assert.equal(price.getAttribute('value'), '1,200,000');
  await user.click(within(dialog).getByRole('combobox', { name: 'سایز' }));
  const mediumOptions = await within(document.body).findAllByText('medium');
  await user.click(mediumOptions.at(-1)!);
  await user.click(within(dialog).getByRole('combobox', { name: 'رنگ' }));
  const blueOptions = await within(document.body).findAllByText('blue');
  await user.click(blueOptions.at(-1)!);
  await user.clear(within(dialog).getByRole('spinbutton', { name: 'موجودی اولیه' }));
  await user.type(within(dialog).getByRole('spinbutton', { name: 'موجودی اولیه' }), '12');
  return user;
}

void test('loads form options only after opening and shows loading on each related input', async () => {
  const originalAdapter = httpClient.defaults.adapter;
  const calls: string[] = [];
  const releases: Array<() => void> = [];
  httpClient.defaults.adapter = async (config) => {
    calls.push(config.url ?? '');
    await new Promise<void>((resolve) => releases.push(resolve));
    const data =
      config.url === '/admin/catalog/categories'
        ? categoriesResponse
        : config.url === '/admin/catalog/product-options/sizes'
          ? sizesResponse
          : colorsResponse;
    return {
      data,
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  };
  const queryClient = createAdminQueryClient();

  try {
    const screen = render(
      <App>
        <QueryClientProvider client={queryClient}>
          <AddProduct />
        </QueryClientProvider>
      </App>,
    );
    assert.deepEqual(calls, []);

    const user = userEvent.setup({ document: globalThis.document });
    await user.click(screen.getByRole('button', { name: 'افزودن محصول' }));
    const dialog = await screen.findByRole('dialog', { name: 'ایجاد محصول' });
    await waitFor(() => assert.equal(calls.length, 3));
    assert.deepEqual(new Set(calls), new Set([
      '/admin/catalog/categories',
      '/admin/catalog/product-options/sizes',
      '/admin/catalog/product-options/colors',
    ]));

    for (const name of ['دسته‌بندی', 'سایز', 'رنگ']) {
      const input = within(dialog).getByRole('combobox', { name });
      assert.equal(input.hasAttribute('disabled'), true);
      assert.equal(input.closest('.ant-select')?.classList.contains('ant-select-loading'), true);
    }

    for (const release of releases) release();
    await waitFor(() => {
      for (const name of ['دسته‌بندی', 'سایز', 'رنگ']) {
        const input = within(dialog).getByRole('combobox', { name });
        assert.equal(input.hasAttribute('disabled'), false);
        assert.equal(input.closest('.ant-select')?.classList.contains('ant-select-loading'), false);
      }
    });
  } finally {
    for (const release of releases) release();
    if (originalAdapter === undefined) delete httpClient.defaults.adapter;
    else httpClient.defaults.adapter = originalAdapter;
    queryClient.clear();
    cleanup();
  }
});

void test('creates a Product, closes the modal, and reports the new first page', async () => {
  const originalAdapter = httpClient.defaults.adapter;
  const calls: Array<{
    readonly method: string | undefined;
    readonly url: string | undefined;
    readonly data: unknown;
  }> = [];
  httpClient.defaults.adapter = async (config) => {
    calls.push({ method: config.method, url: config.url, data: config.data });
    if (config.url?.endsWith('/images')) {
      return {
        data: {
          statusCode: 201,
          hasError: false,
          message: 'تصویر محصول با موفقیت افزوده شد.',
          code: 'PRODUCT_IMAGE_UPLOADED',
          count: 1,
          result: null,
          singleResult: { imageVersion: 2, images: [] },
          details: null,
        },
        status: 201,
        statusText: 'Created',
        headers: {},
        config,
      };
    }
    return {
      data: {
        statusCode: 201,
        hasError: false,
        message: 'محصول با موفقیت ایجاد شد.',
        code: 'PRODUCT_CREATED',
        count: 1,
        result: null,
        singleResult: { id: productId, imageVersion: 1 },
        details: null,
      },
      status: 201,
      statusText: 'Created',
      headers: {},
      config,
    };
  };
  document.cookie = 'admin_csrf_token=test-token; Path=/; SameSite=Strict';
  const queryClient = createAdminQueryClient();
  queryClient.setQueryData(
    categoryKeys.list({ page: 1, pageSize: CATEGORY_OPTIONS_PAGE_SIZE }),
    categoriesResponse,
  );
  queryClient.setQueryData(productOptionKeys.sizes, sizesResponse);
  queryClient.setQueryData(productOptionKeys.colors, colorsResponse);
  let created = 0;

  try {
    const screen = render(
      <App message={{ duration: 0.01 }}>
        <QueryClientProvider client={queryClient}>
          <AddProduct
            onCreated={() => {
              created += 1;
            }}
          />
        </QueryClientProvider>
      </App>,
    );
    const user = userEvent.setup({ document: globalThis.document });
    await user.click(screen.getByRole('button', { name: 'افزودن محصول' }));
    const dialog = await screen.findByRole('dialog', { name: 'ایجاد محصول' });
    fireEvent.change(within(dialog).getByLabelText('تصویر محصول'), {
      target: { files: [validProductImage()] },
    });
    const submitButton = within(dialog).getByRole('button', { name: 'ایجاد محصول' });
    await user.click(submitButton);
    assert.ok((await within(dialog).findAllByRole('alert')).length >= 4);
    assert.equal(calls.length, 0);

    const formUser = await completeRequiredFields(dialog);
    await formUser.click(submitButton);
    await waitFor(() => assert.equal(screen.queryByRole('dialog'), null));

    const post = calls.find(({ url }) => url === '/admin/catalog/products');
    assert.ok(post);
    assert.deepEqual(JSON.parse(String(post.data)), {
      name: 'پیراهن لینن',
      description: null,
      categoryId,
      variants: [
        {
          size: 'medium',
          color: 'blue',
          priceRial: 1200000,
          isActive: true,
          onHandQuantity: 12,
        },
      ],
    });
    const upload = calls.find(({ url }) => url === `/admin/catalog/products/${productId}/images`);
    assert.ok(upload?.data instanceof FormData);
    assert.equal(upload.data.get('imageVersion'), '1');
    assert.equal((upload.data.get('file') as File).name, 'product.png');
    assert.equal(created, 1);
  } finally {
    if (originalAdapter === undefined) delete httpClient.defaults.adapter;
    else httpClient.defaults.adapter = originalAdapter;
    queryClient.clear();
    document.cookie = 'admin_csrf_token=; Path=/; Max-Age=0; SameSite=Strict';
  }
});

void test('keeps the Product modal open and shows the safe Persian service failure', async () => {
  const originalAdapter = httpClient.defaults.adapter;
  httpClient.defaults.adapter = async (config) => {
    throw new axios.AxiosError('Backend failure', 'ERR_BAD_RESPONSE', config, undefined, {
      data: {
        statusCode: 409,
        hasError: true,
        message: 'شناسه تنوع قبلاً ثبت شده است.',
        code: 'VARIANT_SKU_CONFLICT',
        count: 0,
        result: null,
        singleResult: null,
        details: null,
      },
      status: 409,
      statusText: 'Conflict',
      headers: {},
      config,
    });
  };
  document.cookie = 'admin_csrf_token=test-token; Path=/; SameSite=Strict';
  const queryClient = createAdminQueryClient();
  queryClient.setQueryData(
    categoryKeys.list({ page: 1, pageSize: CATEGORY_OPTIONS_PAGE_SIZE }),
    categoriesResponse,
  );
  queryClient.setQueryData(productOptionKeys.sizes, sizesResponse);
  queryClient.setQueryData(productOptionKeys.colors, colorsResponse);

  try {
    const screen = render(
      <App message={{ duration: 0.01 }}>
        <QueryClientProvider client={queryClient}>
          <AddProduct />
        </QueryClientProvider>
      </App>,
    );
    const user = userEvent.setup({ document: globalThis.document });
    await user.click(screen.getByRole('button', { name: 'افزودن محصول' }));
    const dialog = await screen.findByRole('dialog', { name: 'ایجاد محصول' });
    fireEvent.change(within(dialog).getByLabelText('تصویر محصول'), {
      target: { files: [validProductImage()] },
    });
    const formUser = await completeRequiredFields(dialog);
    await formUser.click(within(dialog).getByRole('button', { name: 'ایجاد محصول' }));

    await waitFor(() => {
      assert.ok(screen.getByRole('dialog', { name: 'ایجاد محصول' }));
      assert.ok(screen.getAllByText('شناسه تنوع قبلاً ثبت شده است.').length >= 2);
    });
  } finally {
    if (originalAdapter === undefined) delete httpClient.defaults.adapter;
    else httpClient.defaults.adapter = originalAdapter;
    queryClient.clear();
    document.cookie = 'admin_csrf_token=; Path=/; Max-Age=0; SameSite=Strict';
  }
});

void test('rejects an unsafe selected image immediately and shows a toast error', async () => {
  const queryClient = createAdminQueryClient();
  queryClient.setQueryData(
    categoryKeys.list({ page: 1, pageSize: CATEGORY_OPTIONS_PAGE_SIZE }),
    categoriesResponse,
  );
  queryClient.setQueryData(productOptionKeys.sizes, sizesResponse);
  queryClient.setQueryData(productOptionKeys.colors, colorsResponse);

  try {
    const screen = render(
      <App message={{ duration: 0.01 }}>
        <QueryClientProvider client={queryClient}>
          <AddProduct />
        </QueryClientProvider>
      </App>,
    );
    const user = userEvent.setup({ document: globalThis.document });
    await user.click(screen.getByRole('button', { name: 'افزودن محصول' }));
    const dialog = await screen.findByRole('dialog', { name: 'ایجاد محصول' });
    fireEvent.change(within(dialog).getByLabelText('تصویر محصول'), {
      target: {
        files: [new File(['<svg><script /></svg>'], 'attack.svg', { type: 'image/svg+xml' })],
      },
    });

    await waitFor(() => {
      assert.ok(screen.getAllByText('فقط تصاویر JPG، JPEG، PNG و WebP مجاز هستند.').length >= 1);
    });
  } finally {
    queryClient.clear();
    cleanup();
  }
});
