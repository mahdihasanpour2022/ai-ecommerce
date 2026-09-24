import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { App } from 'antd';
import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { httpClient } from '../app/http/http-client';
import { createAdminQueryClient } from '../app/react-query-provider';
import Products from '../features/products/components/products';
import { ProductTable } from '../features/products/components/product-table';
import { productKeys } from '../features/products/hooks/useGetProducts';
import type { ProductStatusesResponse } from '../features/products/interfaces/product-option-contract';
import type { Product } from '../features/products/interfaces/product-contract';
import { installDomEnvironment } from './dom-environment';

const restoreDom = installDomEnvironment();
process.once('beforeExit', restoreDom);

after(() => cleanup());

const productCategoryId = '22222222-2222-4222-8222-222222222222';
const productId = '11111111-1111-4111-8111-111111111111';
const product: Product = {
  id: productId,
  name: 'پیراهن لینن',
  description: 'پیراهن سبک مناسب تابستان',
  category: { id: productCategoryId, name: 'پیراهن' },
  status: 'ACTIVE',
  variantCount: 1,
  activeVariantCount: 1,
  sizes: ['M'],
  colors: ['مشکی'],
  mainImage: null,
  minimumPriceRial: 1_200_000,
  maximumPriceRial: 1_200_000,
  totalOnHandQuantity: 12,
  createdAt: '2026-09-16T08:00:00.000Z',
  updatedAt: '2026-09-16T08:00:00.000Z',
};

const statusesResponse: ProductStatusesResponse = {
  statusCode: 200,
  hasError: false,
  message: 'وضعیت‌های محصول دریافت شدند.',
  code: 'PRODUCT_STATUS_OPTIONS_FETCHED',
  count: 3,
  result: [
    { status_persian_name: 'پیش‌نویس', status_english_name: 'DRAFT' },
    { status_persian_name: 'فعال', status_english_name: 'ACTIVE' },
    { status_persian_name: 'بایگانی‌شده', status_english_name: 'ARCHIVED' },
  ],
  singleResult: null,
  details: null,
};

void test('loads and displays the protected Product summaries', async () => {
  const originalAdapter = httpClient.defaults.adapter;
  let requestedPage: unknown;
  let requestedPageSize: unknown;
  let requestedName: unknown;
  let requestedAvailability: unknown;

  httpClient.defaults.adapter = async (config) => {
    requestedPage = config.params?.page;
    requestedPageSize = config.params?.pageSize;
    requestedName = config.params?.name;
    requestedAvailability = config.params?.availability;
    return {
      data: {
        statusCode: 200,
        hasError: false,
        message: 'محصولات با موفقیت دریافت شدند.',
        code: 'PRODUCTS_FETCHED',
        count: 1,
        result: null,
        singleResult: {
          items: [
            {
              id: '11111111-1111-4111-8111-111111111111',
              name: 'پیراهن لینن',
              description: 'پیراهن سبک مناسب تابستان',
              category: { id: '22222222-2222-4222-8222-222222222222', name: 'پیراهن' },
              status: 'ACTIVE',
              variantCount: 3,
              activeVariantCount: 2,
              sizes: ['M', 'L'],
              colors: ['مشکی', 'سفید'],
              mainImage: {
                id: '33333333-3333-4333-8333-333333333333',
                mediaType: 'WEBP',
                byteSize: 2048,
                width: 1200,
                height: 800,
                position: 0,
                createdAt: '2026-09-16T08:00:00.000Z',
                updatedAt: '2026-09-16T08:00:00.000Z',
              },
              minimumPriceRial: 1200000,
              maximumPriceRial: 1800000,
              totalOnHandQuantity: 12,
              createdAt: '2026-09-16T08:00:00.000Z',
              updatedAt: '2026-09-16T08:00:00.000Z',
            },
          ],
          page: 2,
          pageSize: 15,
          totalItems: 16,
          totalPages: 2,
        },
        details: null,
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  };
  const queryClient = createAdminQueryClient();

  try {
    const view = render(
      <App>
        <QueryClientProvider client={queryClient}>
          <Products page={2} filters={{ name: 'پیراهن', availability: 'IN_STOCK' }} />
        </QueryClientProvider>
      </App>,
    );

    await waitFor(() => {
      assert.ok(view.getByRole('region', { name: 'جدول محصولات' }));
      assert.ok(view.getByRole('columnheader', { name: 'ردیف' }));
      assert.ok(view.getByRole('columnheader', { name: 'تصویر' }));
      assert.ok(view.getByRole('rowheader', { name: /پیراهن لینن/ }));
      assert.ok(view.getByRole('columnheader', { name: 'توضیحات' }));
      assert.ok(view.getByRole('columnheader', { name: 'سایز' }));
      assert.ok(view.getByRole('columnheader', { name: 'رنگ' }));
      assert.ok(view.getByRole('cell', { name: '۱۶' }));
      assert.ok(view.getByText('پیراهن'));
      assert.ok(view.getByText('پیراهن سبک مناسب تابستان'));
      assert.ok(view.getByText('M'));
      assert.ok(view.getByText('L'));
      assert.ok(view.getByText('مشکی'));
      assert.ok(view.getByText('سفید'));
      assert.ok(view.getByText('فعال'));
      assert.ok(view.getByText('۲ فعال از ۳'));
      assert.ok(view.getByText('۱٬۲۰۰٬۰۰۰ ریال تا ۱٬۸۰۰٬۰۰۰ ریال'));
      assert.ok(view.getByRole('img', { name: 'تصویر پیراهن لینن' }));
    });
    assert.equal(requestedPage, 2);
    assert.equal(requestedPageSize, 15);
    assert.equal(requestedName, 'پیراهن');
    assert.equal(requestedAvailability, 'IN_STOCK');

    const user = userEvent.setup({ document: globalThis.document });
    await user.click(view.getByRole('button', { name: 'نمایش بزرگ تصویر پیراهن لینن' }));
    const preview = await view.findByRole('dialog', { name: 'تصویر محصول پیراهن لینن' });
    const previewImage = within(preview).getByRole('img', { name: 'تصویر بزرگ پیراهن لینن' });
    assert.equal(previewImage.getAttribute('width'), '1200');
    assert.equal(previewImage.getAttribute('height'), '800');
    assert.ok(previewImage.classList.contains('h-auto'));
    assert.equal(
      preview.closest('.ant-modal')?.getAttribute('style')?.includes('--ant-modal-sm-width: 50vw'),
      true,
    );
  } finally {
    if (originalAdapter === undefined) delete httpClient.defaults.adapter;
    else httpClient.defaults.adapter = originalAdapter;
    queryClient.clear();
    cleanup();
  }
});

void test('shows the empty state when no Products exist', async () => {
  const originalAdapter = httpClient.defaults.adapter;
  httpClient.defaults.adapter = async (config) => ({
    data: {
      statusCode: 200,
      hasError: false,
      message: 'محصولات با موفقیت دریافت شدند.',
      code: 'PRODUCTS_FETCHED',
      count: 0,
      result: null,
      singleResult: { items: [], page: 1, pageSize: 15, totalItems: 0, totalPages: 0 },
      details: null,
    },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  });
  const queryClient = createAdminQueryClient();

  try {
    const view = render(
      <App>
        <QueryClientProvider client={queryClient}>
          <Products />
        </QueryClientProvider>
      </App>,
    );
    await waitFor(() => assert.ok(view.getByText('محصولی ثبت نشده است.')));
  } finally {
    if (originalAdapter === undefined) delete httpClient.defaults.adapter;
    else httpClient.defaults.adapter = originalAdapter;
    queryClient.clear();
    cleanup();
  }
});

void test('changes Product status from the server-owned options', async () => {
  const originalAdapter = httpClient.defaults.adapter;
  const calls: Array<{
    readonly method: string | undefined;
    readonly url: string | undefined;
    readonly data: unknown;
  }> = [];
  let releaseStatuses: (() => void) | undefined;
  const statusesGate = new Promise<void>((resolve) => {
    releaseStatuses = resolve;
  });
  httpClient.defaults.adapter = async (config) => {
    calls.push({ method: config.method, url: config.url, data: config.data });
    if (config.url === '/admin/catalog/product-options/statuses') {
      await statusesGate;
      return {
        data: statusesResponse,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    }
    const archived = JSON.parse(String(config.data))?.status === 'ARCHIVED';
    return {
      data: {
        statusCode: 200,
        hasError: false,
        message: archived ? 'محصول بایگانی شد.' : 'محصول ویرایش شد.',
        code: archived ? 'PRODUCT_ARCHIVED' : 'PRODUCT_UPDATED',
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

  try {
    const screen = render(
      <App message={{ duration: 0.01 }}>
        <QueryClientProvider client={queryClient}>
          <ProductTable
            products={[product]}
            page={1}
            pageSize={15}
            totalItems={1}
            onPageChange={() => undefined}
          />
        </QueryClientProvider>
      </App>,
    );
    const user = userEvent.setup({ document: globalThis.document });
    assert.equal(calls.length, 0);

    await user.click(screen.getByRole('button', { name: 'عملیات محصول پیراهن لینن' }));
    const statusActions = await screen.findByRole('dialog', { name: 'عملیات پیراهن لینن' });
    await user.click(within(statusActions).getByRole('button', { name: 'تغییر وضعیت' }));
    const statusDialog = await screen.findByRole('dialog', { name: 'تغییر وضعیت محصول' });
    await waitFor(() =>
      assert.ok(calls.some(({ url }) => url === '/admin/catalog/product-options/statuses')),
    );
    const statusInput = within(statusDialog).getByRole('combobox', {
      name: 'وضعیتی که می‌خواهید',
    });
    assert.equal(statusInput.hasAttribute('disabled'), true);
    assert.equal(
      statusInput.closest('.ant-select')?.classList.contains('ant-select-loading'),
      true,
    );
    releaseStatuses?.();
    assert.ok(await within(statusDialog).findByText('فعال'));
    await user.click(within(statusDialog).getByRole('combobox', { name: 'وضعیتی که می‌خواهید' }));
    await user.click(await within(document.body).findByText('بایگانی‌شده'));
    await user.click(within(statusDialog).getByRole('button', { name: 'تغییر وضعیت' }));
    await waitFor(() =>
      assert.equal(screen.queryByRole('dialog', { name: 'تغییر وضعیت محصول' }), null),
    );

    const archiveCall = calls.find(({ method }) => method === 'patch');
    assert.equal(archiveCall?.method, 'patch');
    assert.equal(archiveCall?.url, `/admin/catalog/products/${productId}`);
    assert.deepEqual(JSON.parse(String(archiveCall?.data)), { status: 'ARCHIVED' });
  } finally {
    releaseStatuses?.();
    if (originalAdapter === undefined) delete httpClient.defaults.adapter;
    else httpClient.defaults.adapter = originalAdapter;
    queryClient.clear();
    document.cookie = 'admin_csrf_token=; Path=/; Max-Age=0; SameSite=Strict';
    cleanup();
  }
});

void test('permanently deletes a Product after explicit confirmation', async () => {
  const originalAdapter = httpClient.defaults.adapter;
  const calls: Array<{
    readonly method: string | undefined;
    readonly url: string | undefined;
  }> = [];
  httpClient.defaults.adapter = async (config) => {
    calls.push({ method: config.method, url: config.url });
    return {
      data: {
        statusCode: 200,
        hasError: false,
        message: 'محصول با موفقیت حذف شد.',
        code: 'PRODUCT_DELETED',
        count: 0,
        result: null,
        singleResult: null,
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
  const listKey = productKeys.list({ page: 1, pageSize: 15 });
  queryClient.setQueryData(listKey, { items: [product] });

  try {
    const screen = render(
      <App message={{ duration: 0.01 }}>
        <QueryClientProvider client={queryClient}>
          <ProductTable
            products={[product]}
            page={1}
            pageSize={15}
            totalItems={1}
            onPageChange={() => undefined}
          />
        </QueryClientProvider>
      </App>,
    );
    const user = userEvent.setup({ document: globalThis.document });

    await user.click(screen.getByRole('button', { name: `عملیات محصول ${product.name}` }));
    const actions = await screen.findByRole('dialog', { name: `عملیات ${product.name}` });
    await user.click(within(actions).getByRole('button', { name: 'حذف' }));
    const dialog = await screen.findByRole('dialog', { name: 'حذف محصول' });
    assert.match(dialog.textContent ?? '', /قابل بازگشت نیست/u);
    await user.click(within(dialog).getByRole('button', { name: 'حذف دائمی محصول' }));
    await waitFor(() =>
      assert.equal(screen.queryByRole('dialog', { name: 'حذف محصول' }), null),
    );

    assert.deepEqual(calls.find(({ method }) => method === 'delete'), {
      method: 'delete',
      url: `/admin/catalog/products/${productId}`,
    });
    assert.equal(queryClient.getQueryState(listKey)?.isInvalidated, true);
  } finally {
    if (originalAdapter === undefined) delete httpClient.defaults.adapter;
    else httpClient.defaults.adapter = originalAdapter;
    queryClient.clear();
    document.cookie = 'admin_csrf_token=; Path=/; Max-Age=0; SameSite=Strict';
    cleanup();
  }
});
