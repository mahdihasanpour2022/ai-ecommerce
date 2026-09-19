import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { App } from 'antd';
import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddCategory from '../features/categories/components/add-category';
import { CATEGORY_OPTIONS_PAGE_SIZE } from '../features/categories/constants/pagination';
import { categoryKeys } from '../features/categories/hooks/useGetCategories';
import type { CategoriesResponse } from '../features/categories/interfaces/category-contract';
import { createCategorySchema } from '../features/categories/schemas/create-category-schema';
import { createAdminQueryClient } from '../app/react-query-provider';
import { httpClient } from '../app/http/http-client';
import { installDomEnvironment } from './dom-environment';

const restoreDom = installDomEnvironment();
process.once('beforeExit', restoreDom);
afterEach(() => cleanup());

const parentId = '10000000-0000-4000-8000-000000000001';
const initialCategories: CategoriesResponse = {
  statusCode: 200,
  hasError: false,
  message: 'دسته‌بندی‌ها دریافت شدند.',
  code: 'CATEGORIES_FETCHED',
  count: 1,
  result: [
    {
      id: parentId,
      name: 'پوشاک زنانه',
      parentId: null,
      level: 1,
      children: [],
      createdAt: '2026-09-14T00:00:00.000Z',
      updatedAt: '2026-09-14T00:00:00.000Z',
    },
  ],
  singleResult: null,
  details: null,
};

void test('accepts the Backend Category name bounds and rejects invalid parent identifiers', () => {
  assert.equal(createCategorySchema.safeParse({ name: ' ', parentId: '' }).success, false);
  assert.equal(createCategorySchema.safeParse({ name: 'ا'.repeat(121), parentId: '' }).success, false);
  assert.equal(
    createCategorySchema.safeParse({ name: 'پوشاک', parentId: 'not-a-uuid' }).success,
    false,
  );
  assert.deepEqual(createCategorySchema.parse({ name: '  پوشاک  ', parentId: '' }), {
    name: 'پوشاک',
    parentId: '',
  });
});

void test('validates and creates a child Category, then refreshes the Category query', async () => {
  const originalAdapter = httpClient.defaults.adapter;
  const calls: Array<{ readonly method: string | undefined; readonly data: unknown }> = [];
  httpClient.defaults.adapter = async (config) => {
    calls.push({ method: config.method, data: config.data });
    if (config.method === 'post') {
      return {
        data: {
          statusCode: 201,
          hasError: false,
          message: 'دسته‌بندی با موفقیت ایجاد شد.',
          code: 'CATEGORY_CREATED',
          count: 1,
          result: null,
          singleResult: {
            id: '20000000-0000-4000-8000-000000000002',
            name: 'مانتو',
            parentId,
            level: 2,
            children: [],
            createdAt: '2026-09-14T00:00:00.000Z',
            updatedAt: '2026-09-14T00:00:00.000Z',
          },
          details: null,
        },
        status: 201,
        statusText: 'Created',
        headers: {},
        config,
      };
    }
    return {
      data: initialCategories,
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  };
  document.cookie = 'admin_csrf_token=test-token; Path=/; SameSite=Strict';
  const queryClient = createAdminQueryClient();
  queryClient.setQueryData(
    categoryKeys.list({ page: 1, pageSize: CATEGORY_OPTIONS_PAGE_SIZE }),
    initialCategories,
  );
  let created = 0;

  try {
    const screen = render(
      <App message={{ duration: 0.01 }}>
        <QueryClientProvider client={queryClient}>
          <AddCategory onCreated={() => { created += 1; }} />
        </QueryClientProvider>
      </App>,
    );
    const user = userEvent.setup({ document: globalThis.document });

    await user.click(screen.getByRole('button', { name: 'افزودن دسته‌بندی' }));
    const dialog = await screen.findByRole('dialog', { name: 'ایجاد دسته‌بندی' });
    const submitButton = within(dialog).getByRole('button', { name: 'ایجاد دسته‌بندی' });
    await user.click(submitButton);
    assert.ok(await within(dialog).findByRole('alert'));
    assert.equal(calls.length, 0);

    await user.type(within(dialog).getByRole('textbox', { name: 'نام دسته‌بندی' }), '  مانتو  ');
    await user.click(within(dialog).getByRole('combobox', { name: 'دسته‌بندی والد' }));
    const parentCategory = initialCategories.result[0];
    assert.ok(parentCategory);
    await user.click(await screen.findByText(parentCategory.name));
    await user.click(submitButton);

    await waitFor(() => assert.equal(screen.queryByRole('dialog'), null));
    const post = calls.find(({ method }) => method === 'post');
    assert.ok(post);
    assert.deepEqual(JSON.parse(String(post.data)), { name: 'مانتو', parentId });
    assert.ok(calls.some(({ method }) => method === 'get'));
    assert.equal(created, 1);
  } finally {
    if (originalAdapter === undefined) delete httpClient.defaults.adapter;
    else httpClient.defaults.adapter = originalAdapter;
    queryClient.clear();
    document.cookie = 'admin_csrf_token=; Path=/; Max-Age=0; SameSite=Strict';
  }
});
