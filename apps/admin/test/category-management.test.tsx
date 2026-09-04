import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { cleanup, render, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminUiProvider } from '../app/admin-ui-provider';
import { AdminHttpError } from '../app/http/http-client';
import { CategoryManagementView } from '../app/catalog/categories/category-management';
import type { CatalogApi } from '../app/catalog/catalog-api';
import type { CategoryDto } from '../app/catalog/catalog-contracts';
import { installDomEnvironment } from './dom-environment';

const restoreDom = installDomEnvironment();
process.once('beforeExit', restoreDom);

afterEach(() => cleanup());

const ROOT_ID = '11111111-1111-4111-8111-111111111111';
const CHILD_ID = '22222222-2222-4222-8222-222222222222';
const OTHER_ID = '33333333-3333-4333-8333-333333333333';
const NEW_ID = '44444444-4444-4444-8444-444444444444';
const time = '2026-09-04T10:00:00.000Z';

const child: CategoryDto = {
  id: CHILD_ID,
  name: 'زنانه',
  parentId: ROOT_ID,
  level: 2,
  children: [],
  createdAt: time,
  updatedAt: time,
};
const root: CategoryDto = {
  id: ROOT_ID,
  name: 'پوشاک',
  parentId: null,
  level: 1,
  children: [child],
  createdAt: time,
  updatedAt: time,
};
const other: CategoryDto = {
  id: OTHER_ID,
  name: 'اکسسوری',
  parentId: null,
  level: 1,
  children: [],
  createdAt: time,
  updatedAt: time,
};
const tree = [root, other] as const;

function client(overrides: Partial<CatalogApi> = {}): CatalogApi {
  return {
    categories: async () => tree,
    createCategory: async ({ name, parentId }) => ({
      id: NEW_ID,
      name,
      parentId,
      level: parentId === null ? 1 : 2,
      children: [],
      createdAt: time,
      updatedAt: time,
    }),
    updateCategory: async (_categoryId, input) => ({
      ...other,
      name: input.name ?? other.name,
      parentId: input.parentId === undefined ? other.parentId : input.parentId,
    }),
    deleteCategory: async () => undefined,
    products: async () => ({
      items: [],
      page: 1,
      pageSize: 25,
      totalItems: 0,
      totalPages: 0,
    }),
    createProduct: async () => {
      throw new Error('Not used by Category tests.');
    },
    updateProduct: async () => {
      throw new Error('Not used by Category tests.');
    },
    createVariant: async () => {
      throw new Error('Not used by Category tests.');
    },
    updateVariant: async () => {
      throw new Error('Not used by Category tests.');
    },
    product: async () => {
      throw new Error('unused');
    },
    priceDisplaySetting: async () => ({ unit: 'TOMAN' }),
    ...overrides,
  };
}

function renderManagement(canManage: boolean, api: CatalogApi) {
  return render(
    <AdminUiProvider>
      <CategoryManagementView canManage={canManage} client={api} />
    </AdminUiProvider>,
  );
}

void test('presents loading, retryable read failure, and the actionable empty state', async () => {
  let reads = 0;
  const api = client({
    categories: async () => {
      reads += 1;
      if (reads === 1) throw new AdminHttpError('network', null, 'NETWORK_ERROR');
      return [];
    },
  });
  const view = renderManagement(true, api);
  assert.ok(view.getByText('در حال دریافت دسته‌بندی‌ها'));
  assert.ok(await view.findByText(/ارتباط با سرور برقرار نشد/u));
  await userEvent
    .setup({ document: globalThis.document })
    .click(view.getByRole('button', { name: 'تلاش دوباره' }));
  assert.ok(await view.findByRole('heading', { name: 'هنوز دسته‌بندی‌ای ثبت نشده است' }));
  assert.equal(reads, 2);
});

void test('turns a forbidden read into a protected state and refreshes identity once', async () => {
  let denied = 0;
  const view = render(
    <AdminUiProvider>
      <CategoryManagementView
        canManage
        client={client({
          categories: async () => {
            throw new AdminHttpError('http', 403, 'INSUFFICIENT_PERMISSION');
          },
        })}
        onPermissionDenied={() => {
          denied += 1;
        }}
      />
    </AdminUiProvider>,
  );
  assert.ok(await view.findByRole('heading', { name: 'دسترسی مجاز نیست' }));
  assert.equal(denied, 1);
  assert.equal(view.queryByRole('button', { name: 'تلاش دوباره' }), null);
});

void test('renders the ordered nested tree read-only and supports keyboard disclosure', async () => {
  const view = renderManagement(false, client());
  await view.findByRole('tree', { name: 'درخت دسته‌بندی‌ها' });
  assert.deepEqual(
    view
      .getAllByRole('treeitem')
      .map((item) => item.querySelector('.category-node-name')?.textContent),
    ['پوشاک', 'زنانه', 'اکسسوری'],
  );
  assert.equal(view.queryByRole('button', { name: 'افزودن دسته‌بندی' }), null);
  assert.equal(view.queryByRole('button', { name: 'ویرایش' }), null);
  assert.ok(view.getByText('این ساختار برای حساب شما فقط خواندنی است.'));

  const disclosure = view.getByRole('button', { name: 'بستن زیرمجموعه‌های پوشاک' });
  disclosure.focus();
  const user = userEvent.setup({ document: globalThis.document });
  await user.keyboard('{Enter}');
  assert.equal(disclosure.getAttribute('aria-expanded'), 'false');
  assert.equal(view.queryByText('زنانه'), null);
  cleanup();
});

void test('validates and single-flights create, then refetches after the normalized response', async () => {
  let createCalls = 0;
  let readCalls = 0;
  let resolveCreate: ((category: CategoryDto) => void) | undefined;
  const api = client({
    categories: async () => {
      readCalls += 1;
      return tree;
    },
    createCategory: ({ parentId }) => {
      createCalls += 1;
      return new Promise<CategoryDto>((resolve) => {
        resolveCreate = resolve;
        assert.equal(parentId, null);
      });
    },
  });
  const view = renderManagement(true, api);
  const user = userEvent.setup({ document: globalThis.document });
  const add = await view.findByRole('button', { name: 'افزودن دسته‌بندی' });
  await user.click(add);
  const dialog = view.getByRole('dialog', { name: 'افزودن دسته‌بندی' });
  const input = within(dialog).getByRole('textbox', { name: 'نام دسته‌بندی (الزامی)' });
  await user.click(within(dialog).getByRole('button', { name: 'ذخیره' }));
  await waitFor(() => assert.equal(globalThis.document.activeElement, input));
  assert.match(within(dialog).getByRole('alert').textContent ?? '', /الزامی/u);

  await user.type(input, '  پوشاک   مردانه  ');
  await user.dblClick(within(dialog).getByRole('button', { name: 'ذخیره' }));
  await waitFor(() => assert.equal(createCalls, 1));
  assert.ok(within(dialog).getByRole('button', { name: 'در حال ذخیره…' }).hasAttribute('disabled'));
  resolveCreate?.({
    id: NEW_ID,
    name: 'پوشاک مردانه',
    parentId: null,
    level: 1,
    children: [],
    createdAt: time,
    updatedAt: time,
  });
  await waitFor(() => assert.equal(readCalls, 2));
  assert.ok(await view.findByText('دسته‌بندی «پوشاک مردانه» ذخیره شد.'));
  cleanup();
});

void test('preserves edit input and focuses the field on a stable name conflict', async () => {
  const api = client({
    updateCategory: async () => {
      throw new AdminHttpError('http', 409, 'CATEGORY_NAME_CONFLICT');
    },
  });
  const view = renderManagement(true, api);
  const user = userEvent.setup({ document: globalThis.document });
  await view.findByRole('tree');
  const rootNode = view.getByText('پوشاک').closest('.category-node');
  assert.ok(rootNode);
  await user.click(within(rootNode as HTMLElement).getByRole('button', { name: 'ویرایش' }));
  const dialog = view.getByRole('dialog', { name: 'ویرایش پوشاک' });
  const input = within(dialog).getByRole('textbox', { name: 'نام دسته‌بندی (الزامی)' });
  await user.clear(input);
  await user.type(input, 'پوشاک تازه');
  await user.click(within(dialog).getByRole('button', { name: 'ذخیره' }));
  const errors = await within(dialog).findAllByText(/همین نام/u);
  assert.ok(errors.every((error) => error.getAttribute('role') === 'alert'));
  assert.equal((input as HTMLInputElement).value, 'پوشاک تازه');
  await waitFor(() => assert.equal(globalThis.document.activeElement, input));
  cleanup();
});

void test('keeps edit input while explicitly refreshing after a hierarchy conflict', async () => {
  let reads = 0;
  const api = client({
    categories: async () => {
      reads += 1;
      return tree;
    },
    updateCategory: async () => {
      throw new AdminHttpError('http', 409, 'CATEGORY_MOVE_INVALID');
    },
  });
  const view = renderManagement(true, api);
  const user = userEvent.setup({ document: globalThis.document });
  await view.findByRole('tree');
  const node = view.getByText('اکسسوری').closest('.category-node');
  assert.ok(node);
  await user.click(within(node as HTMLElement).getByRole('button', { name: 'ویرایش' }));
  const dialog = view.getByRole('dialog', { name: 'ویرایش اکسسوری' });
  const input = within(dialog).getByRole('textbox', { name: 'نام دسته‌بندی (الزامی)' });
  await user.clear(input);
  await user.type(input, 'اکسسوری تازه');
  await user.click(within(dialog).getByRole('button', { name: 'ذخیره' }));
  const errors = await within(dialog).findAllByText(/انتقال به این والد مجاز نیست/u);
  assert.ok(errors.every((error) => error.getAttribute('role') === 'alert'));
  await waitFor(() =>
    assert.equal(globalThis.document.activeElement?.getAttribute('role'), 'combobox'),
  );
  await user.click(within(dialog).getByRole('button', { name: 'تازه‌سازی ساختار' }));
  await waitFor(() => assert.equal(reads, 2));
  assert.equal((input as HTMLInputElement).value, 'اکسسوری تازه');
  assert.ok(view.getByRole('dialog', { name: 'ویرایش اکسسوری' }));
});

void test('labels leaf deletion, retains the node on conflict, and returns focus on cancel', async () => {
  let deleteCalls = 0;
  const api = client({
    deleteCategory: async () => {
      deleteCalls += 1;
      throw new AdminHttpError('http', 409, 'CATEGORY_NOT_EMPTY');
    },
  });
  const view = renderManagement(true, api);
  const user = userEvent.setup({ document: globalThis.document });
  await view.findByRole('tree');
  const childNode = view.getByText('زنانه').closest('.category-node');
  assert.ok(childNode);
  const deleteButton = within(childNode as HTMLElement).getByRole('button', { name: 'حذف' });
  await user.click(deleteButton);
  let dialog = view.getByRole('dialog', { name: 'حذف زنانه' });
  assert.match(dialog.textContent ?? '', /هر محصولی/u);
  await user.click(within(dialog).getByRole('button', { name: 'انصراف' }));
  await waitFor(() => assert.equal(globalThis.document.activeElement, deleteButton));

  await user.click(deleteButton);
  dialog = view.getByRole('dialog', { name: 'حذف زنانه' });
  await user.click(within(dialog).getByRole('button', { name: 'حذف دسته‌بندی' }));
  assert.equal(deleteCalls, 1);
  const error = await within(dialog).findByText(/زیرمجموعه یا محصول/u);
  assert.equal(error.closest('[role="alert"]')?.getAttribute('role'), 'alert');
  assert.ok(view.getByText('زنانه'));
  cleanup();
});

void test('reconciles successful deletion and focuses the nearest surviving node after refetch', async () => {
  let reads = 0;
  const api = client({
    categories: async () => {
      reads += 1;
      return reads === 1 ? tree : [{ ...root, children: [] }, other];
    },
  });
  const view = renderManagement(true, api);
  const user = userEvent.setup({ document: globalThis.document });
  await view.findByRole('tree');
  const childNode = view.getByText('زنانه').closest('.category-node');
  assert.ok(childNode);
  await user.click(within(childNode as HTMLElement).getByRole('button', { name: 'حذف' }));
  await user.click(
    within(view.getByRole('dialog', { name: 'حذف زنانه' })).getByRole('button', {
      name: 'حذف دسته‌بندی',
    }),
  );
  assert.ok(await view.findByText('دسته‌بندی «زنانه» حذف شد.'));
  await waitFor(() => assert.equal(reads, 2));
  await waitFor(() =>
    assert.equal(globalThis.document.activeElement?.getAttribute('data-category-id'), ROOT_ID),
  );
  assert.equal(view.queryByText('زنانه'), null);
});

void test('closes mutation UI and returns focus when manage permission is revoked', async () => {
  const api = client();
  const view = renderManagement(true, api);
  const user = userEvent.setup({ document: globalThis.document });
  await view.findByRole('tree');
  const node = view.getByText('اکسسوری').closest('.category-node');
  assert.ok(node);
  const edit = within(node as HTMLElement).getByRole('button', { name: 'ویرایش' });
  await user.click(edit);
  assert.ok(view.getByRole('dialog', { name: 'ویرایش اکسسوری' }));
  view.rerender(
    <AdminUiProvider>
      <CategoryManagementView canManage={false} client={api} />
    </AdminUiProvider>,
  );
  assert.equal(view.container.querySelector('[role="dialog"]'), null);
  assert.equal(view.container.textContent?.includes('ویرایش'), false);
  await new Promise((resolve) => globalThis.setTimeout(resolve, 10));
  assert.equal(
    globalThis.document.activeElement,
    view.container.querySelector('#categories-heading'),
  );
});
