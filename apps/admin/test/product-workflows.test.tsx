import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { cleanup, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminUiProvider } from '../app/admin-ui-provider';
import type { CatalogApi, CreateProductInput } from '../app/catalog/catalog-api';
import type {
  CategoryDto,
  ProductDetailDto,
  ProductListDto,
} from '../app/catalog/catalog-contracts';
import { ProductCreateView } from '../app/catalog/products/product-create';
import { ProductListView } from '../app/catalog/products/product-list';
import { parseProductListLocation } from '../app/catalog/products/product-model';
import { installDomEnvironment } from './dom-environment';

const restoreDom = installDomEnvironment();
process.once('beforeExit', restoreDom);
afterEach(() => cleanup());

const CATEGORY_ID = '11111111-1111-4111-8111-111111111111';
const PRODUCT_ID = '22222222-2222-4222-8222-222222222222';
const VARIANT_ID = '33333333-3333-4333-8333-333333333333';
const time = '2026-09-04T10:00:00.000Z';
const category: CategoryDto = {
  id: CATEGORY_ID,
  name: 'پیراهن',
  parentId: null,
  level: 1,
  children: [],
  createdAt: time,
  updatedAt: time,
};
const product: ProductDetailDto = {
  id: PRODUCT_ID,
  name: 'پیراهن نخی',
  description: null,
  category: { id: CATEGORY_ID, name: category.name },
  status: 'DRAFT',
  imageVersion: 1,
  variants: [
    {
      id: VARIANT_ID,
      productId: PRODUCT_ID,
      sku: 'SHIRT-ONE',
      size: null,
      color: null,
      priceRial: 12_300,
      isActive: true,
      inventory: { onHandQuantity: 2, version: 1 },
      createdAt: time,
      updatedAt: time,
    },
  ],
  images: [],
  createdAt: time,
  updatedAt: time,
};
const productList: ProductListDto = {
  items: [
    {
      id: PRODUCT_ID,
      name: product.name,
      category: product.category,
      status: 'DRAFT',
      variantCount: 1,
      activeVariantCount: 1,
      mainImage: null,
      minimumPriceRial: 12_300,
      maximumPriceRial: 12_300,
      totalOnHandQuantity: 2,
      createdAt: time,
      updatedAt: time,
    },
  ],
  page: 1,
  pageSize: 25,
  totalItems: 1,
  totalPages: 1,
};

function ui(children: React.ReactNode) {
  return render(<AdminUiProvider>{children}</AdminUiProvider>);
}

void test('renders responsive Product summaries and canonicalizes unsafe URL state', async () => {
  const navigations: Array<{ href: string; replace?: boolean }> = [];
  let createCalls = 0;
  const client: Pick<CatalogApi, 'products' | 'categories' | 'priceDisplaySetting'> = {
    products: async () => productList,
    categories: async () => [category],
    priceDisplaySetting: async () => ({ unit: 'TOMAN' }),
  };
  const screen = ui(
    <ProductListView
      location={parseProductListLocation({ page: 'bad', unknown: 'value' })}
      canManage
      client={client}
      onNavigate={(href, replace) =>
        navigations.push({ href, ...(replace === undefined ? {} : { replace }) })
      }
      onCreate={() => {
        createCalls += 1;
      }}
    />,
  );

  await screen.findByRole('heading', { name: 'پیراهن نخی' });
  assert.equal(screen.getByText('۱٬۲۳۰ تومان') !== null, true);
  assert.equal(screen.getByText('بدون تصویر') !== null, true);
  assert.deepEqual(navigations[0], { href: '/catalog/products', replace: true });
  await userEvent
    .setup({ document: globalThis.document })
    .click(screen.getByRole('button', { name: 'ایجاد محصول پیش‌نویس' }));
  assert.equal(createCalls, 1);
});

void test('writes filter changes canonically and corrects an out-of-range Product page', async () => {
  const navigations: Array<{ href: string; replace?: boolean }> = [];
  const client: Pick<CatalogApi, 'products' | 'categories' | 'priceDisplaySetting'> = {
    products: async () => ({
      items: [],
      page: 5,
      pageSize: 25,
      totalItems: 30,
      totalPages: 2,
    }),
    categories: async () => [category],
    priceDisplaySetting: async () => ({ unit: 'RIAL' }),
  };
  ui(
    <ProductListView
      location={parseProductListLocation({ page: '5' })}
      canManage
      client={client}
      onNavigate={(href, replace) =>
        navigations.push({ href, ...(replace === undefined ? {} : { replace }) })
      }
      onCreate={() => undefined}
    />,
  );
  await waitFor(() =>
    assert.deepEqual(navigations, [{ href: '/catalog/products?page=2', replace: true }]),
  );
});

void test('distinguishes a filtered empty Product result and emits a reset-page filter URL', async () => {
  const navigations: string[] = [];
  const screen = ui(
    <ProductListView
      location={parseProductListLocation({ status: 'DRAFT' })}
      canManage
      client={{
        products: async () => ({
          items: [],
          page: 1,
          pageSize: 25,
          totalItems: 0,
          totalPages: 0,
        }),
        categories: async () => [category],
        priceDisplaySetting: async () => ({ unit: 'RIAL' }),
      }}
      onNavigate={(href) => navigations.push(href)}
      onCreate={() => undefined}
    />,
  );
  const user = userEvent.setup({ document: globalThis.document });
  await screen.findByRole('heading', { name: 'محصولی با این فیلترها پیدا نشد' });
  await user.click(screen.getByLabelText('وضعیت'));
  await user.click(await screen.findByText('فعال'));
  assert.equal(navigations.at(-1), '/catalog/products?status=ACTIVE');
});

void test('keeps Product mutation actions absent for a read-only user', async () => {
  const screen = ui(
    <ProductListView
      location={parseProductListLocation({})}
      canManage={false}
      client={{
        products: async () => productList,
        categories: async () => [category],
        priceDisplaySetting: async () => ({ unit: 'RIAL' }),
      }}
      onNavigate={() => undefined}
      onCreate={() => assert.fail('read-only create must not be called')}
    />,
  );
  await screen.findByRole('heading', { name: product.name });
  assert.equal(screen.queryByRole('button', { name: 'ایجاد محصول پیش‌نویس' }), null);
  assert.equal(screen.getByRole('note').textContent?.includes('فقط خواندنی'), true);
});

void test('creates a normalized default-mode Draft once and routes to its workspace', async () => {
  const submitted: CreateProductInput[] = [];
  const createdIds: string[] = [];
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const client: Pick<CatalogApi, 'categories' | 'priceDisplaySetting' | 'createProduct'> = {
    categories: async () => [category],
    priceDisplaySetting: async () => ({ unit: 'TOMAN' }),
    createProduct: async (input) => {
      submitted.push(input);
      await pending;
      return product;
    },
  };
  const screen = ui(
    <ProductCreateView
      canManage
      client={client}
      onCreated={(id) => createdIds.push(id)}
      onCancel={() => undefined}
    />,
  );
  const user = userEvent.setup({ document: globalThis.document });
  await screen.findByRole('heading', { name: 'ایجاد محصول پیش‌نویس' });

  await user.type(screen.getByLabelText('نام محصول (الزامی)'), '  پیراهن   نخی  ');
  await user.click(screen.getByLabelText('دسته‌بندی (الزامی)'));
  await user.click(await screen.findByText(category.name));
  await user.type(screen.getByLabelText('کد کالا (الزامی)'), 'shirt-one');
  await user.type(screen.getByLabelText('قیمت (تومان) (الزامی)'), '۱٬۲۳۰');
  const quantity = screen.getByLabelText('موجودی اولیه');
  await user.clear(quantity);
  await user.type(quantity, '۲');
  const submit = screen.getByRole('button', { name: 'ایجاد محصول پیش‌نویس' });
  await user.dblClick(submit);

  await waitFor(() => assert.equal(submitted.length, 1));
  assert.deepEqual(submitted[0], {
    name: 'پیراهن نخی',
    description: null,
    categoryId: CATEGORY_ID,
    variants: [
      {
        sku: 'SHIRT-ONE',
        size: null,
        color: null,
        priceRial: 12_300,
        isActive: true,
        onHandQuantity: 2,
      },
    ],
  });
  assert.equal(submit.getAttribute('aria-busy'), 'true');
  release();
  await waitFor(() => assert.deepEqual(createdIds, [PRODUCT_ID]));
});

void test('focuses the first invalid Draft field and enforces named Variant mode', async () => {
  const screen = ui(
    <ProductCreateView
      canManage
      client={{
        categories: async () => [category],
        priceDisplaySetting: async () => ({ unit: 'RIAL' }),
        createProduct: async () => {
          throw new Error('invalid form must not submit');
        },
      }}
      onCreated={() => undefined}
      onCancel={() => undefined}
    />,
  );
  const user = userEvent.setup({ document: globalThis.document });
  await screen.findByRole('heading', { name: 'ایجاد محصول پیش‌نویس' });
  await user.click(screen.getByRole('button', { name: 'ایجاد محصول پیش‌نویس' }));
  await waitFor(() =>
    assert.equal(document.activeElement, screen.getByLabelText('نام محصول (الزامی)')),
  );

  await user.click(screen.getByRole('radio', { name: 'دارای اندازه یا رنگ' }));
  assert.equal(screen.getByRole('button', { name: 'افزودن تنوع' }) !== null, true);
  assert.equal(screen.getByLabelText('اندازه (اختیاری)') !== null, true);
});
