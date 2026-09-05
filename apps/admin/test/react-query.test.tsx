import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { createAdminQueryClient, shouldRetryAdminQuery } from '../app/react-query-provider';
import { AdminHttpError } from '../app/http/http-client';
import { catalogQueryKeys } from '../hooks/catalog/catalog-query-keys';
import { useRQDeleter } from '../hooks/rq_hooks/useRQDeleter';
import { useRQFetcher } from '../hooks/rq_hooks/useRQFetcher';
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

void test('builds complete stable keys for every catalog read variable', () => {
  assert.deepEqual(catalogQueryKeys.categories(), ['catalog', 'categories']);
  assert.deepEqual(catalogQueryKeys.products({ page: 2, pageSize: 25, status: 'DRAFT' }), [
    'catalog',
    'products',
    { page: 2, pageSize: 25, status: 'DRAFT' },
  ]);
  assert.deepEqual(catalogQueryKeys.product('product-1'), ['catalog', 'product', 'product-1']);
  assert.deepEqual(catalogQueryKeys.priceDisplaySetting(), [
    'catalog',
    'settings',
    'price-display-unit',
  ]);
});

void test('reuses fresh fetcher data from cache without another endpoint call', async () => {
  const queryClient = createAdminQueryClient();
  let calls = 0;
  const options = {
    queryKey: ['test', 'cached-get'] as const,
    queryFn: async () => {
      calls += 1;
      return { value: 'cached' };
    },
  };
  const first = renderHook(() => useRQFetcher(options), { wrapper: wrapper(queryClient) });
  await waitFor(() => assert.equal(first.result.current.isSuccess, true));
  first.unmount();

  const second = renderHook(() => useRQFetcher(options), { wrapper: wrapper(queryClient) });
  await waitFor(() => assert.equal(second.result.current.data?.value, 'cached'));
  assert.equal(calls, 1);
  second.unmount();
  queryClient.clear();
});

void test('sender invalidates each QueryKey unchanged and never retries a failed mutation', async () => {
  const queryClient = createAdminQueryClient();
  const firstKey = ['catalog', 'categories'] as const;
  const secondKey = ['catalog', 'products', { page: 1 }] as const;
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

void test('deleter uses the same no-retry mutation boundary', async () => {
  const queryClient = createAdminQueryClient();
  let calls = 0;
  const failure = new AdminHttpError('http', 503, 'TEMPORARY');
  const deletion = renderHook(
    () =>
      useRQDeleter<void, string>({
        mutationFn: async () => {
          calls += 1;
          throw failure;
        },
      }),
    { wrapper: wrapper(queryClient) },
  );
  await assert.rejects(deletion.result.current.mutateAsync('category-1'));
  assert.equal(calls, 1);
  deletion.unmount();
  queryClient.clear();
});
