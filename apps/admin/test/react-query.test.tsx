import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { createAdminQueryClient, shouldRetryAdminQuery } from '../app/react-query-provider';
import { AdminHttpError, httpClient } from '../app/http/http-client';
import { safeFetcherPath, useRQFetcher } from '../hooks/rq_hooks/useRQFetcher';
import { useRQSender } from '../hooks/rq_hooks/useRQSender';
import { installDomEnvironment } from './dom-environment';

const restoreDom = installDomEnvironment();
process.once('beforeExit', restoreDom);

after(() => cleanup());

function wrapper(queryClient: QueryClient) {
  return function QueryWrapper({ children }: Readonly<{ children: ReactNode }>) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

void test('uses bounded retries only for safe temporary query failures', () => {
  assert.equal(
    shouldRetryAdminQuery(0, new AdminHttpError('network', null, 'NETWORK_ERROR')),
    true,
  );
  assert.equal(
    shouldRetryAdminQuery(1, new AdminHttpError('timeout', null, 'REQUEST_TIMEOUT')),
    true,
  );
  assert.equal(shouldRetryAdminQuery(0, new AdminHttpError('http', 503, 'TEMPORARY')), true);
  assert.equal(shouldRetryAdminQuery(0, new AdminHttpError('http', 409, 'CONFLICT')), false);
  assert.equal(shouldRetryAdminQuery(0, new AdminHttpError('canceled', null, 'CANCELED')), false);
  assert.equal(
    shouldRetryAdminQuery(2, new AdminHttpError('network', null, 'NETWORK_ERROR')),
    false,
  );
});

void test('fetcher uses the existing same-origin BFF client and returns response.data', async () => {
  const originalAdapter = httpClient.defaults.adapter;
  const calls: {
    readonly url: string | undefined;
    readonly baseURL: string | undefined;
    readonly authPolicy: unknown;
  }[] = [];
  httpClient.defaults.adapter = async (config) => {
    calls.push({ url: config.url, baseURL: config.baseURL, authPolicy: config.authPolicy });
    return {
      data: { value: 'categories' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  };
  const queryClient = createAdminQueryClient();
  try {
    const hook = renderHook(
      () =>
        useRQFetcher({
          queryKey: ['categories'],
          url: '/admin/catalog/categories',
        }),
      { wrapper: wrapper(queryClient) },
    );
    await waitFor(() => assert.equal(hook.result.current.isSuccess, true));
    assert.deepEqual(hook.result.current.data, { value: 'categories' });
    assert.deepEqual(calls, [
      {
        url: '/admin/catalog/categories',
        baseURL: '/api/v1',
        authPolicy: { csrf: 'omit', failure: 'caller', refresh: 'eligible' },
      },
    ]);
    hook.unmount();
  } finally {
    if (originalAdapter === undefined) delete httpClient.defaults.adapter;
    else httpClient.defaults.adapter = originalAdapter;
    queryClient.clear();
  }
});

void test('fetcher rejects paths that could bypass the same-origin BFF', () => {
  assert.equal(safeFetcherPath('/admin/catalog/categories'), '/admin/catalog/categories');
  for (const path of [
    'https://api.example.com/categories',
    '//api.example.com/categories',
    '/admin/../auth',
    'admin/catalog/categories',
  ]) {
    assert.throws(() => safeFetcherPath(path), { code: 'UNSAFE_REQUEST_PATH' });
  }
});

void test('sender owns declarative HTTP execution and invalidates exact query keys', async () => {
  const originalAdapter = httpClient.defaults.adapter;
  const calls: Array<{
    readonly authPolicy: unknown;
    readonly data: unknown;
    readonly method: string | undefined;
    readonly params: unknown;
    readonly url: string | undefined;
  }> = [];
  httpClient.defaults.adapter = async (config) => {
    calls.push({
      authPolicy: config.authPolicy,
      data: config.data,
      method: config.method,
      params: config.params,
      url: config.url,
    });
    return {
      data: { saved: true },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  };
  document.cookie = 'admin_csrf_token=test-token; Path=/; SameSite=Strict';
  const queryClient = createAdminQueryClient();
  const queryKey = ['categories'] as const;
  queryClient.setQueryData(queryKey, ['existing']);

  try {
    const hook = renderHook(
      () =>
        useRQSender<{ saved: boolean }, { categoryId: string; name: string }>({
          mutationKey: ['categories', 'edit'],
          request: {
            method: 'patch',
            url: ({ categoryId }) => `/admin/catalog/categories/${categoryId}`,
            body: ({ name }) => ({ name }),
            params: () => ({ source: 'table' }),
          },
          invalidateQueryKeys: [queryKey],
        }),
      { wrapper: wrapper(queryClient) },
    );

    await act(async () => {
      const result = await hook.result.current.mutateAsync({ categoryId: 'category-id', name: 'زنانه' });
      assert.deepEqual(result, { saved: true });
    });

    assert.deepEqual(calls, [
      {
        authPolicy: { csrf: 'required', failure: 'caller', refresh: 'eligible' },
        data: JSON.stringify({ name: 'زنانه' }),
        method: 'patch',
        params: { source: 'table' },
        url: '/admin/catalog/categories/category-id',
      },
    ]);
    assert.equal(queryClient.getQueryState(queryKey)?.isInvalidated, true);
    hook.unmount();
  } finally {
    if (originalAdapter === undefined) delete httpClient.defaults.adapter;
    else httpClient.defaults.adapter = originalAdapter;
    queryClient.clear();
    document.cookie = 'admin_csrf_token=; Path=/; Max-Age=0; SameSite=Strict';
  }
});

void test('sender rejects declarative mutation paths that bypass the BFF', async () => {
  const queryClient = createAdminQueryClient();
  const hook = renderHook(
    () =>
      useRQSender<void, void>({
        request: { method: 'delete', url: '//external.example/category' },
      }),
    { wrapper: wrapper(queryClient) },
  );

  await assert.rejects(hook.result.current.mutateAsync(), {
    code: 'UNSAFE_REQUEST_PATH',
  });
  hook.unmount();
  queryClient.clear();
});

void test('sender invalidates each QueryKey unchanged and never retries a failed mutation', async () => {
  const queryClient = createAdminQueryClient();
  const firstKey = ['auth', 'current'] as const;
  const secondKey = ['auth', 'permissions'] as const;
  queryClient.setQueryData(firstKey, ['one']);
  queryClient.setQueryData(secondKey, ['two']);
  const success = renderHook(
    () =>
      useRQSender<string, string>({
        mutationFn: async (value) => value,
        invalidateQueryKeys: [firstKey, secondKey],
      }),
    { wrapper: wrapper(queryClient) },
  );
  await act(async () => {
    await success.result.current.mutateAsync('saved');
  });
  assert.equal(queryClient.getQueryState(firstKey)?.isInvalidated, true);
  assert.equal(queryClient.getQueryState(secondKey)?.isInvalidated, true);

  let calls = 0;
  const failure = new AdminHttpError('network', null, 'NETWORK_ERROR');
  const failed = renderHook(
    () =>
      useRQSender<void, void>({
        mutationFn: async () => {
          calls += 1;
          throw failure;
        },
      }),
    { wrapper: wrapper(queryClient) },
  );
  await assert.rejects(failed.result.current.mutateAsync(), (error: unknown) => error === failure);
  assert.equal(calls, 1);
  success.unmount();
  failed.unmount();
  queryClient.clear();
});
