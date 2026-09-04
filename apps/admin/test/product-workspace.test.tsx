import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { cleanup, render, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminUiProvider } from '../app/admin-ui-provider';
import type {
  CatalogApi,
  CreateVariantInput,
  UpdateProductInput,
  UpdateVariantInput,
} from '../app/catalog/catalog-api';
import type {
  CategoryDto,
  ProductDetailDto,
  ProductVariantDto,
} from '../app/catalog/catalog-contracts';
import { ProductWorkspaceView } from '../app/catalog/products/product-workspace';
import { installDomEnvironment } from './dom-environment';

const restoreDom = installDomEnvironment();
process.once('beforeExit', restoreDom);
afterEach(() => cleanup());

const PRODUCT_ID = '22222222-2222-4222-8222-222222222222';
const CATEGORY_ID = '11111111-1111-4111-8111-111111111111';
const VARIANT_ID = '33333333-3333-4333-8333-333333333333';
const SECOND_VARIANT_ID = '44444444-4444-4444-8444-444444444444';
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
const firstVariant: ProductVariantDto = {
  id: VARIANT_ID,
  productId: PRODUCT_ID,
  sku: 'SHIRT-M',
  size: 'M',
  color: null,
  priceRial: 12_300,
  isActive: true,
  inventory: { onHandQuantity: 5, version: 1 },
  createdAt: time,
  updatedAt: time,
};
const secondVariant: ProductVariantDto = {
  ...firstVariant,
  id: SECOND_VARIANT_ID,
  sku: 'SHIRT-L',
  size: 'L',
};
const product: ProductDetailDto = {
  id: PRODUCT_ID,
  name: 'پیراهن نخی',
  description: null,
  category: { id: CATEGORY_ID, name: category.name },
  status: 'DRAFT',
  imageVersion: 1,
  variants: [firstVariant, secondVariant],
  images: [],
  createdAt: time,
  updatedAt: time,
};

type Client = Pick<
  CatalogApi,
  | 'product'
  | 'categories'
  | 'priceDisplaySetting'
  | 'updateProduct'
  | 'createVariant'
  | 'updateVariant'
>;

function client(overrides: Partial<Client> = {}): Client {
  return {
    product: async () => product,
    categories: async () => [category],
    priceDisplaySetting: async () => ({ unit: 'TOMAN' }),
    updateProduct: async (_id, input) => ({
      ...product,
      name: input.name ?? product.name,
      description: input.description === undefined ? product.description : input.description,
    }),
    createVariant: async (_id, input) => ({
      ...secondVariant,
      id: '55555555-5555-4555-8555-555555555555',
      sku: input.sku,
      size: input.size,
      color: input.color,
      priceRial: input.priceRial,
      inventory: { onHandQuantity: input.onHandQuantity, version: 1 },
    }),
    updateVariant: async (id, input) => ({
      ...(id === firstVariant.id ? firstVariant : secondVariant),
      ...input,
    }),
    ...overrides,
  };
}

function view(section: 'overview' | 'variants', canManage: boolean, api: Client) {
  return render(
    <AdminUiProvider>
      <ProductWorkspaceView
        productId={PRODUCT_ID}
        section={section}
        canManage={canManage}
        client={api}
      />
    </AdminUiProvider>,
  );
}

void test('renders every retained Variant and exact Inventory without mutation controls for readers', async () => {
  const screen = view('variants', false, client());
  await screen.findByRole('heading', { name: product.name });
  assert.equal(screen.getAllByText('موجودی دقیق: ۵').length, 2);
  assert.equal(screen.getAllByText('۱٬۲۳۰ تومان').length, 2);
  assert.equal(screen.queryByRole('button', { name: 'ذخیره تنوع' }), null);
  assert.equal(screen.queryByRole('button', { name: 'افزودن تنوع' }), null);
  assert.equal(screen.queryByRole('button', { name: /حذف/u }), null);
});

void test('submits only normalized changed Product fields and reconciles the response', async () => {
  const updates: UpdateProductInput[] = [];
  const screen = view(
    'overview',
    true,
    client({
      updateProduct: async (_id, input) => {
        updates.push(input);
        return { ...product, name: 'پیراهن رسمی', updatedAt: '2026-09-04T11:00:00.000Z' };
      },
    }),
  );
  const user = userEvent.setup({ document: globalThis.document });
  const name = await screen.findByLabelText('نام محصول (الزامی)');
  await user.type(name, '   رسمی  ');
  await user.click(screen.getByRole('button', { name: 'ذخیره مشخصات محصول' }));
  await waitFor(() => assert.deepEqual(updates, [{ name: 'پیراهن نخی رسمی' }]));
  await screen.findByRole('heading', { name: 'پیراهن رسمی' });
});

void test('keeps Archived Products read-only even for managers', async () => {
  const screen = view(
    'overview',
    true,
    client({ product: async () => ({ ...product, status: 'ARCHIVED' }) }),
  );
  await screen.findByText('محصول بایگانی‌شده تا بازگشت به پیش‌نویس فقط خواندنی است.');
  assert.equal(screen.queryByRole('button', { name: 'ذخیره مشخصات محصول' }), null);
  assert.equal(screen.getByRole('heading', { name: product.name }) !== null, true);
});

void test('labels deactivation, focuses cancel, and updates a retained Variant without deletion', async () => {
  const updates: UpdateVariantInput[] = [];
  const screen = view(
    'variants',
    true,
    client({
      updateVariant: async (_id, input) => {
        updates.push(input);
        return { ...firstVariant, ...input, updatedAt: '2026-09-04T11:00:00.000Z' };
      },
    }),
  );
  const user = userEvent.setup({ document: globalThis.document });
  await screen.findByRole('heading', { name: firstVariant.sku });
  const card = screen.getByRole('heading', { name: firstVariant.sku }).closest('article');
  assert.ok(card);
  await user.click(within(card).getByRole('button', { name: 'غیرفعال‌کردن' }));
  const dialog = await screen.findByRole('dialog', { name: `غیرفعال‌کردن ${firstVariant.sku}` });
  await waitFor(() =>
    assert.equal(document.activeElement, within(dialog).getByRole('button', { name: 'انصراف' })),
  );
  await user.click(within(dialog).getByRole('button', { name: 'غیرفعال‌کردن تنوع' }));
  await waitFor(() => assert.deepEqual(updates, [{ isActive: false }]));
  assert.equal(screen.queryByRole('button', { name: /حذف/u }), null);
});

void test('adds a named Variant with zero initial Inventory and canonical price', async () => {
  const creations: CreateVariantInput[] = [];
  const screen = view(
    'variants',
    true,
    client({
      createVariant: async (_id, input) => {
        creations.push(input);
        return {
          ...secondVariant,
          id: '55555555-5555-4555-8555-555555555555',
          ...input,
          inventory: { onHandQuantity: 0, version: 1 },
        };
      },
    }),
  );
  const user = userEvent.setup({ document: globalThis.document });
  await user.click(await screen.findByRole('button', { name: 'افزودن تنوع' }));
  await user.type(screen.getByLabelText('کد کالا', { selector: '#new-variant-sku' }), 'shirt-xl');
  await user.type(
    screen.getByLabelText('اندازه (اختیاری)', { selector: '#new-variant-size' }),
    'XL',
  );
  await user.type(
    screen.getByLabelText('قیمت (تومان)', { selector: '#new-variant-price' }),
    '۱۵۰۰',
  );
  await user.click(screen.getByRole('button', { name: 'ثبت تنوع' }));
  await waitFor(() =>
    assert.deepEqual(creations, [
      {
        sku: 'SHIRT-XL',
        size: 'XL',
        color: null,
        priceRial: 15_000,
        isActive: true,
        onHandQuantity: 0,
      },
    ]),
  );
});
