import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import axios from 'axios';
import { QueryClientProvider } from '@tanstack/react-query';
import { App } from 'antd';
import { cleanup, render, waitFor } from '@testing-library/react';
import { httpClient } from '../app/http/http-client';
import { createAdminQueryClient } from '../app/react-query-provider';
import Categories from '../features/categories/components/categories';
import { installDomEnvironment } from './dom-environment';

const restoreDom = installDomEnvironment();
process.once('beforeExit', restoreDom);

after(() => cleanup());

void test('shows the normalized Category failure in an Ant Design toast', async () => {
  const originalAdapter = httpClient.defaults.adapter;
  const requestParams: unknown[] = [];
  httpClient.defaults.adapter = async (config) => {
    requestParams.push(config.params);
    throw new axios.AxiosError('Backend failure', 'ERR_BAD_RESPONSE', config, undefined, {
      data: {
        statusCode: 500,
        hasError: true,
        message: 'خطای امن دسته‌بندی‌ها.',
        code: 'INTERNAL_SERVER_ERROR',
        count: 0,
        result: null,
        singleResult: null,
        details: null,
      },
      status: 500,
      statusText: 'Internal Server Error',
      headers: {},
      config,
    });
  };
  const queryClient = createAdminQueryClient();

  try {
    const view = render(
      <App message={{ duration: 0.01 }}>
        <QueryClientProvider client={queryClient}>
          <Categories />
        </QueryClientProvider>
      </App>,
    );
    await waitFor(() => {
      assert.ok(view.getByText('خطای امن دسته‌بندی‌ها.'));
      assert.equal(view.getAllByRole('alert').length, 2);
      assert.ok(view.getByRole('button', { name: 'تلاش دوباره' }));
    });
    assert.deepEqual(requestParams[0], { page: 1, pageSize: 15 });
  } finally {
    if (originalAdapter === undefined) delete httpClient.defaults.adapter;
    else httpClient.defaults.adapter = originalAdapter;
    queryClient.clear();
    cleanup();
  }
});
