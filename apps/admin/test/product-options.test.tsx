import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import type { ReactNode } from 'react';
import { App } from 'antd';
import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { httpClient } from '../app/http/http-client';
import { createAdminQueryClient } from '../app/react-query-provider';
import {
  useGetProductColors,
  useGetProductSizes,
  useGetProductStatuses,
} from '../features/products/hooks/useGetProductOptions';
import { installDomEnvironment } from './dom-environment';

const restoreDom = installDomEnvironment();
process.once('beforeExit', restoreDom);
afterEach(() => cleanup());

void test('loads Product sizes, colors, and statuses from same-origin option endpoints', async () => {
  const originalAdapter = httpClient.defaults.adapter;
  const calls: Array<string | undefined> = [];
  httpClient.defaults.adapter = async (config) => {
    calls.push(config.url);
    const isSizes = config.url?.endsWith('/sizes') ?? false;
    const isStatuses = config.url?.endsWith('/statuses') ?? false;
    const result = isSizes
      ? ['small', 'medium', 'large', 'x-large', '2x-large', '3x-large']
      : isStatuses
        ? [
            { status_persian_name: 'پیش‌نویس', status_english_name: 'DRAFT' },
            { status_persian_name: 'فعال', status_english_name: 'ACTIVE' },
            { status_persian_name: 'بایگانی‌شده', status_english_name: 'ARCHIVED' },
          ]
        : [
            { 'color-name': 'blue', 'hex-code': '#2563EB' },
            { 'color-name': 'red', 'hex-code': '#DC2626' },
            { 'color-name': 'green', 'hex-code': '#16A34A' },
            { 'color-name': 'white', 'hex-code': '#FFFFFF' },
            { 'color-name': 'black', 'hex-code': '#111827' },
          ];
    return {
      data: {
        statusCode: 200,
        hasError: false,
        message: 'گزینه‌های محصول دریافت شدند.',
        code: isSizes
          ? 'PRODUCT_SIZES_FETCHED'
          : isStatuses
            ? 'PRODUCT_STATUS_OPTIONS_FETCHED'
            : 'PRODUCT_COLORS_FETCHED',
        count: result.length,
        result,
        singleResult: null,
        details: null,
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  };
  const queryClient = createAdminQueryClient();
  const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <App message={{ duration: 0.01 }}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </App>
  );

  try {
    const hook = renderHook(
      () => ({
        sizes: useGetProductSizes(),
        colors: useGetProductColors(),
        statuses: useGetProductStatuses(),
      }),
      { wrapper },
    );
    await waitFor(() => {
      assert.equal(hook.result.current.sizes.isSuccess, true);
      assert.equal(hook.result.current.colors.isSuccess, true);
      assert.equal(hook.result.current.statuses.isSuccess, true);
    });

    assert.deepEqual(calls.sort(), [
      '/admin/catalog/product-options/colors',
      '/admin/catalog/product-options/sizes',
      '/admin/catalog/product-options/statuses',
    ]);
    assert.deepEqual(hook.result.current.sizes.data?.result, [
      'small',
      'medium',
      'large',
      'x-large',
      '2x-large',
      '3x-large',
    ]);
    assert.deepEqual(hook.result.current.colors.data?.result[0], {
      'color-name': 'blue',
      'hex-code': '#2563EB',
    });
    assert.deepEqual(hook.result.current.statuses.data?.result, [
      { status_persian_name: 'پیش‌نویس', status_english_name: 'DRAFT' },
      { status_persian_name: 'فعال', status_english_name: 'ACTIVE' },
      { status_persian_name: 'بایگانی‌شده', status_english_name: 'ARCHIVED' },
    ]);
    hook.unmount();
  } finally {
    if (originalAdapter === undefined) delete httpClient.defaults.adapter;
    else httpClient.defaults.adapter = originalAdapter;
    queryClient.clear();
  }
});
