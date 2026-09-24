import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { App } from 'antd';
import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { httpClient } from '../app/http/http-client';
import { createAdminQueryClient } from '../app/react-query-provider';
import { ProductFilterPanel } from '../features/products/components/product-filter-panel';
import { parseProductFilters } from '../features/products/hooks/use-product-filters';
import type { ProductFilterFormValues } from '../features/products/schemas/product-filter-schema';
import { installDomEnvironment } from './dom-environment';

const restoreDom = installDomEnvironment();
process.once('beforeExit', restoreDom);
after(() => cleanup());

void test('parses only supported Product filters from URL search parameters', () => {
  const params = new URLSearchParams({
    name: ' Cotton ',
    status: 'ACTIVE',
    availability: 'IN_STOCK',
    createdFrom: '2026-09-01T08:15:20.000Z',
    minimumPriceRial: '120000',
    ignored: 'value',
  });
  assert.deepEqual(parseProductFilters(params), {
    name: 'Cotton',
    status: 'ACTIVE',
    availability: 'IN_STOCK',
    createdFrom: '2026-09-01T08:15:20.000Z',
    minimumPriceRial: '120000',
  });
});

void test('loads filter options only after expansion and applies or clears the complete form', async () => {
  const originalAdapter = httpClient.defaults.adapter;
  const calls: string[] = [];
  let releaseOptions: (() => void) | undefined;
  const optionsGate = new Promise<void>((resolve) => { releaseOptions = resolve; });
  httpClient.defaults.adapter = async (config) => {
    calls.push(config.url ?? '');
    await optionsGate;
    const responses: Record<string, unknown> = {
      '/admin/catalog/categories': {
        statusCode: 200, hasError: false, message: 'ok', code: 'CATEGORIES_FETCHED', count: 1,
        result: [{ id: '22222222-2222-4222-8222-222222222222', name: 'پیراهن', parentId: null, level: 1, image: null, children: [], createdAt: '2026-09-20T00:00:00.000Z', updatedAt: '2026-09-20T00:00:00.000Z' }],
        singleResult: null, details: null,
      },
      '/admin/catalog/product-options/sizes': { statusCode: 200, hasError: false, message: 'ok', code: 'PRODUCT_SIZE_OPTIONS_FETCHED', count: 1, result: ['medium'], singleResult: null, details: null },
      '/admin/catalog/product-options/colors': { statusCode: 200, hasError: false, message: 'ok', code: 'PRODUCT_COLOR_OPTIONS_FETCHED', count: 1, result: [{ 'color-name': 'black', 'hex-code': '#111827' }], singleResult: null, details: null },
      '/admin/catalog/product-options/statuses': { statusCode: 200, hasError: false, message: 'ok', code: 'PRODUCT_STATUS_OPTIONS_FETCHED', count: 1, result: [{ status_persian_name: 'فعال', status_english_name: 'ACTIVE' }], singleResult: null, details: null },
    };
    return { data: responses[config.url ?? ''], status: 200, statusText: 'OK', headers: {}, config };
  };
  const queryClient = createAdminQueryClient();
  let applied: ProductFilterFormValues | undefined;
  let cleared = false;

  try {
    const view = render(
      <App>
        <QueryClientProvider client={queryClient}>
          <ProductFilterPanel filters={{}} onApply={(values) => { applied = values; }} onClear={() => { cleared = true; }} />
        </QueryClientProvider>
      </App>,
    );
    const user = userEvent.setup({ document: globalThis.document });
    assert.deepEqual(calls, []);
    await user.click(view.getByRole('button', { name: /فیلتر محصولات/u }));
    await waitFor(() => assert.equal(calls.length, 4));
    assert.equal((view.getByLabelText('سایز') as HTMLSelectElement).disabled, true);
    assert.equal((view.getByLabelText('رنگ') as HTMLSelectElement).disabled, true);
    releaseOptions?.();
    await view.findByRole('option', { name: 'medium' });

    await user.type(view.getByLabelText('نام محصول'), 'Cotton');
    await user.selectOptions(view.getByLabelText('سایز'), 'medium');
    await user.selectOptions(view.getByLabelText('رنگ'), 'black');
    await user.selectOptions(view.getByLabelText('وضعیت محصول'), 'ACTIVE');
    await user.selectOptions(view.getByLabelText('موجودی'), 'IN_STOCK');
    const minimumPrice = view.getByLabelText('حداقل قیمت (ریال)') as HTMLInputElement;
    const maximumPrice = view.getByLabelText('حداکثر قیمت (ریال)') as HTMLInputElement;
    await user.type(minimumPrice, '1200000');
    await user.type(maximumPrice, '2500000');
    assert.equal(minimumPrice.value, '1,200,000');
    assert.equal(maximumPrice.value, '2,500,000');
    await user.click(view.getByRole('button', { name: 'اعمال فیلترها' }));
    await waitFor(() => assert.equal(applied?.name, 'Cotton'));
    assert.equal(applied?.size, 'medium');
    assert.equal(applied?.color, 'black');
    assert.equal(applied?.status, 'ACTIVE');
    assert.equal(applied?.availability, 'IN_STOCK');
    assert.equal(applied?.minimumPriceRial, '1200000');
    assert.equal(applied?.maximumPriceRial, '2500000');

    await user.click(view.getByRole('button', { name: 'حذف همه فیلترها' }));
    assert.equal(cleared, true);
    assert.equal((view.getByLabelText('نام محصول') as HTMLInputElement).value, '');
  } finally {
    releaseOptions?.();
    if (originalAdapter === undefined) delete httpClient.defaults.adapter;
    else httpClient.defaults.adapter = originalAdapter;
    queryClient.clear();
    cleanup();
  }
});
