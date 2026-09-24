import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { App } from 'antd';
import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { httpClient } from '../app/http/http-client';
import { createAdminQueryClient } from '../app/react-query-provider';
import { CategoryTable } from '../features/categories/components/category-table';
import { categoryKeys } from '../features/categories/hooks/useGetCategories';
import type { Category } from '../features/categories/interfaces/category-contract';
import { formatPersianDateTime } from '../utils/date-time';
import { installDomEnvironment } from './dom-environment';

const restoreDom = installDomEnvironment();
process.once('beforeExit', restoreDom);
afterEach(() => cleanup());

function validCategoryImage(): File {
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

const rootId = '10000000-0000-4000-8000-000000000001';
const childId = '20000000-0000-4000-8000-000000000002';
const child: Category = {
  id: childId,
  name: 'مانتو',
  parentId: rootId,
  level: 2,
  image: null,
  children: [],
  createdAt: '2026-09-14T08:30:00.000Z',
  updatedAt: '2026-09-14T08:30:00.000Z',
};
const root: Category = {
  id: rootId,
  name: 'پوشاک',
  parentId: null,
  level: 1,
  image: {
    id: '30000000-0000-4000-8000-000000000003',
    mediaType: 'PNG',
    byteSize: 20,
    width: 320,
    height: 240,
  },
  children: [child],
  createdAt: '2026-09-14T08:30:00.000Z',
  updatedAt: '2026-09-14T08:30:00.000Z',
};

void test('formats valid dates in the Persian calendar and handles invalid values', () => {
  assert.match(formatPersianDateTime('2026-09-14T08:30:00.000Z'), /۱۴۰۵/u);
  assert.equal(formatPersianDateTime('invalid'), '—');
});

void test('shows fifteen root Categories per controlled table page', () => {
  const categories = Array.from({ length: 16 }, (_, index): Category => ({
    id: `30000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    name: `دسته‌بندی ${index + 1}`,
    parentId: null,
    level: 1,
    image: null,
    children: [],
    createdAt: '2026-09-14T08:30:00.000Z',
    updatedAt: '2026-09-14T08:30:00.000Z',
  }));
  const queryClient = createAdminQueryClient();
  const view = render(
    <App>
      <QueryClientProvider client={queryClient}>
        <CategoryTable categories={categories} page={1} />
      </QueryClientProvider>
    </App>,
  );

  assert.ok(view.getByText('دسته‌بندی 1'));
  assert.ok(view.getByText('دسته‌بندی 15'));
  assert.equal(view.queryByText('دسته‌بندی 16'), null);

  view.rerender(
    <App>
      <QueryClientProvider client={queryClient}>
        <CategoryTable categories={categories} page={2} />
      </QueryClientProvider>
    </App>,
  );
  assert.ok(view.getByText('دسته‌بندی 16'));
  assert.equal(view.queryByText('دسته‌بندی 1'), null);
  assert.ok(view.getByRole('columnheader', { name: 'ردیف' }));
  assert.ok(view.getByRole('cell', { name: '۱۶' }));
  queryClient.clear();
});

void test('renders the Persian tree table and updates Category data after edit and delete', async () => {
  const originalAdapter = httpClient.defaults.adapter;
  const calls: Array<{
    readonly method: string | undefined;
    readonly url: string | undefined;
    readonly data: unknown;
  }> = [];
  httpClient.defaults.adapter = async (config) => {
    calls.push({ method: config.method, url: config.url, data: config.data });
    const isDelete = config.method === 'delete';
    return {
      data: {
        statusCode: 200,
        hasError: false,
        message: isDelete ? 'دسته‌بندی با موفقیت حذف شد.' : 'دسته‌بندی با موفقیت ویرایش شد.',
        code: isDelete ? 'CATEGORY_DELETED' : 'CATEGORY_UPDATED',
        count: isDelete ? 0 : 1,
        result: null,
        singleResult: isDelete ? null : { ...root, name: 'پوشاک جدید' },
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
  queryClient.setQueryData(categoryKeys.all, { result: [root] });

  try {
    const screen = render(
      <App message={{ duration: 0.01 }}>
        <QueryClientProvider client={queryClient}>
          <CategoryTable categories={[root]} />
        </QueryClientProvider>
      </App>,
    );
    const user = userEvent.setup({ document: globalThis.document });

    assert.ok(screen.getByRole('region', { name: 'جدول دسته‌بندی‌ها' }));
    assert.ok(document.querySelector('.ant-table-bordered'));
    assert.ok(document.querySelector('.category-tree-table .ant-table-small'));
    for (const heading of ['ردیف', 'تصویر', 'زیر‌دسته‌ها', 'نام', 'سطح', 'زمان ایجاد', 'عملیات']) {
      assert.ok(screen.getByRole('columnheader', { name: heading }));
    }
    assert.ok(screen.getByRole('img', { name: 'تصویر پوشاک' }));
    assert.match(screen.getByRole('region').textContent ?? '', /۱۴۰۵/u);
    await user.click(screen.getByRole('button', { name: 'نمایش زیر‌دسته‌های پوشاک' }));
    const rootName = screen.getByText('پوشاک');
    const childName = screen.getByText('مانتو');
    assert.match(rootName.closest('tr')?.className ?? '', /category-row-level-1/u);
    assert.match(childName.closest('tr')?.className ?? '', /category-row-level-2/u);
    assert.ok(screen.getByText('اصلی'));
    assert.ok(screen.getByText('سطح ۲'));

    await user.click(screen.getByRole('button', { name: 'عملیات دسته‌بندی پوشاک' }));
    assert.ok(
      screen
        .getByRole('button', { name: 'عملیات دسته‌بندی پوشاک' })
        .querySelector('[data-icon="actions"]'),
    );
    const actionDialog = await screen.findByRole('dialog', { name: 'عملیات پوشاک' });
    const editAction = within(actionDialog).getByRole('button', { name: 'ویرایش' });
    const deleteAction = within(actionDialog).getByRole('button', { name: 'حذف' });
    assert.ok(editAction.querySelector('[data-icon="edit"]'));
    assert.ok(deleteAction.querySelector('[data-icon="delete"]'));
    assert.match(deleteAction.className, /bg-red-400/u);
    assert.doesNotMatch(deleteAction.className, /bg-red-700/u);
    await user.click(editAction);
    const editDialog = await screen.findByRole('dialog', { name: 'ویرایش دسته‌بندی' });
    const nameInput = within(editDialog).getByRole('textbox', { name: 'نام دسته‌بندی' });
    const saveButton = within(editDialog).getByRole('button', { name: 'ذخیره تغییرات' });
    await waitFor(() => assert.equal((nameInput as HTMLInputElement).value, 'پوشاک'));
    await user.clear(nameInput);
    await user.click(saveButton);
    assert.ok(await within(editDialog).findByRole('alert'));
    assert.equal(
      calls.some(({ method }) => method === 'patch'),
      false,
    );
    await user.type(nameInput, '  پوشاک جدید  ');
    await user.upload(
      within(editDialog).getByLabelText('تصویر جدید (اختیاری)'),
      validCategoryImage(),
    );
    await user.click(saveButton);
    await waitFor(() =>
      assert.equal(screen.queryByRole('dialog', { name: 'ویرایش دسته‌بندی' }), null),
    );

    const patchCall = calls.find(({ method }) => method === 'patch');
    assert.ok(patchCall);
    assert.equal(patchCall.url, `/admin/catalog/categories/${rootId}`);
    assert.ok(patchCall.data instanceof FormData);
    assert.equal(patchCall.data.get('name'), 'پوشاک جدید');
    assert.equal(patchCall.data.get('parentId'), '');
    assert.ok(patchCall.data.get('file') instanceof File);
    assert.equal(queryClient.getQueryState(categoryKeys.all)?.isInvalidated, true);

    await user.click(screen.getByRole('button', { name: 'عملیات دسته‌بندی مانتو' }));
    const childActions = await screen.findByRole('dialog', { name: 'عملیات مانتو' });
    await user.click(within(childActions).getByRole('button', { name: 'حذف' }));
    const deleteDialog = await screen.findByRole('dialog', { name: 'حذف دسته‌بندی' });
    assert.match(deleteDialog.textContent ?? '', /مانتو/u);
    await user.click(within(deleteDialog).getByRole('button', { name: 'حذف دسته‌بندی' }));
    await waitFor(() =>
      assert.equal(screen.queryByRole('dialog', { name: 'حذف دسته‌بندی' }), null),
    );

    const deleteCall = calls.find(({ method }) => method === 'delete');
    assert.equal(deleteCall?.url, `/admin/catalog/categories/${childId}`);
  } finally {
    if (originalAdapter === undefined) delete httpClient.defaults.adapter;
    else httpClient.defaults.adapter = originalAdapter;
    queryClient.clear();
    document.cookie = 'admin_csrf_token=; Path=/; Max-Age=0; SameSite=Strict';
  }
});

void test('closes mutation modals and shows the safe Persian service error', async () => {
  const originalAdapter = httpClient.defaults.adapter;
  httpClient.defaults.adapter = async (config) => {
    const deleting = config.method === 'delete';
    throw new axios.AxiosError('Backend failure', 'ERR_BAD_RESPONSE', config, undefined, {
      data: {
        statusCode: deleting ? 409 : 403,
        hasError: true,
        message: deleting
          ? 'دسته‌بندی دارای زیرمجموعه یا محصول است.'
          : 'اجازه ویرایش این دسته‌بندی را ندارید.',
        code: deleting ? 'CATEGORY_NOT_EMPTY' : 'AUTHORIZATION_FORBIDDEN',
        count: 0,
        result: null,
        singleResult: null,
        details: null,
      },
      status: deleting ? 409 : 403,
      statusText: deleting ? 'Conflict' : 'Forbidden',
      headers: {},
      config,
    });
  };
  document.cookie = 'admin_csrf_token=test-token; Path=/; SameSite=Strict';
  const queryClient = createAdminQueryClient();

  try {
    const screen = render(
      <App message={{ duration: 5 }}>
        <QueryClientProvider client={queryClient}>
          <CategoryTable categories={[root]} />
        </QueryClientProvider>
      </App>,
    );
    const user = userEvent.setup({ document: globalThis.document });

    await user.click(screen.getByRole('button', { name: 'عملیات دسته‌بندی پوشاک' }));
    await user.click(
      within(await screen.findByRole('dialog', { name: 'عملیات پوشاک' })).getByRole('button', {
        name: 'ویرایش',
      }),
    );
    await user.click(
      within(await screen.findByRole('dialog', { name: 'ویرایش دسته‌بندی' })).getByRole('button', {
        name: 'ذخیره تغییرات',
      }),
    );
    await waitFor(() =>
      assert.equal(screen.queryByRole('dialog', { name: 'ویرایش دسته‌بندی' }), null),
    );
    assert.ok(await screen.findByText('اجازه ویرایش این دسته‌بندی را ندارید.'));

    await user.click(screen.getByRole('button', { name: 'عملیات دسته‌بندی پوشاک' }));
    await user.click(
      within(await screen.findByRole('dialog', { name: 'عملیات پوشاک' })).getByRole('button', {
        name: 'حذف',
      }),
    );
    await user.click(
      within(await screen.findByRole('dialog', { name: 'حذف دسته‌بندی' })).getByRole('button', {
        name: 'حذف دسته‌بندی',
      }),
    );
    await waitFor(() =>
      assert.equal(screen.queryByRole('dialog', { name: 'حذف دسته‌بندی' }), null),
    );
    assert.ok(await screen.findByText('دسته‌بندی دارای زیرمجموعه یا محصول است.'));
  } finally {
    if (originalAdapter === undefined) delete httpClient.defaults.adapter;
    else httpClient.defaults.adapter = originalAdapter;
    queryClient.clear();
    document.cookie = 'admin_csrf_token=; Path=/; Max-Age=0; SameSite=Strict';
  }
});
