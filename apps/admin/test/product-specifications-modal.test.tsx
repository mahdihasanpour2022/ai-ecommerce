import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, within } from '@testing-library/react';
import { App } from 'antd';
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { httpClient } from '../app/http/http-client';
import { ProductSpecificationsModal } from '../features/products/components/product-specifications-modal';
import type { Product } from '../features/products/interfaces/product-contract';
import { createAdminQueryClient } from '../providers/react-query-provider';
import { installDomEnvironment } from './dom-environment';

const restoreDom = installDomEnvironment();
after(() => {
  cleanup();
  restoreDom();
});

const product: Product = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'پیراهن',
  description: null,
  tag: null,
  category: { id: '22222222-2222-4222-8222-222222222222', name: 'پیراهن' },
  status: 'DRAFT',
  variantCount: 0,
  activeVariantCount: 0,
  sizes: [],
  colors: [],
  mainImage: null,
  originalPriceRial: 1_000,
  finalPriceRial: 1_000,
  discountPercent: 0,
  currency: 'IRR',
  totalOnHandQuantity: 0,
  mainSpecs: [{ title: 'جنس', description: 'نخ' }],
  specificationCount: 2,
  createdAt: '2026-09-16T08:00:00.000Z',
  updatedAt: '2026-09-16T08:00:00.000Z',
};

void test('loads and displays main specifications before secondary specifications', async () => {
  const originalAdapter = httpClient.defaults.adapter;
  const queryClient = createAdminQueryClient();
  httpClient.defaults.adapter = async (config) => ({
    data:
      config.url === `/admin/catalog/products/${product.id}`
        ? {
            statusCode: 200,
            hasError: false,
            message: 'جزئیات محصول دریافت شد.',
            code: 'PRODUCT_FETCHED',
            count: 1,
            result: null,
            singleResult: {
              ...product,
              imageVersion: 1,
              specifications: [
                { title: 'جنس', description: 'نخ' },
                { title: 'کشور سازنده', description: 'ایران' },
              ],
              variants: [],
              images: [],
            },
            details: null,
          }
        : {
            statusCode: 200,
            hasError: false,
            message: 'گزینه‌ها دریافت شدند.',
            code: 'PRODUCT_OPTIONS_FETCHED',
            count: 0,
            result: [],
            singleResult: null,
            details: null,
          },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  });

  try {
    const screen = render(
      <App>
        <QueryClientProvider client={queryClient}>
          <ProductSpecificationsModal product={product} onCancel={() => undefined} />
        </QueryClientProvider>
      </App>,
    );
    const dialog = await screen.findByRole('dialog', { name: 'ویژگی‌های پیراهن' });
    await within(dialog).findByRole('table', { name: 'ویژگی‌های اصلی محصول' });
    const headings = within(dialog).getAllByRole('heading', { level: 3 });
    assert.deepEqual(
      headings.map((heading) => heading.textContent),
      ['ویژگی‌های اصلی', 'ویژگی‌های فرعی'],
    );
    assert.ok(within(dialog).getByRole('table', { name: 'ویژگی‌های اصلی محصول' }));
    assert.ok(within(dialog).getByRole('table', { name: 'ویژگی‌های فرعی محصول' }));
    assert.ok(within(dialog).getByText('کشور سازنده'));
    assert.ok(within(dialog).getByText('ایران'));
  } finally {
    if (originalAdapter === undefined) delete httpClient.defaults.adapter;
    else httpClient.defaults.adapter = originalAdapter;
    queryClient.clear();
  }
});
