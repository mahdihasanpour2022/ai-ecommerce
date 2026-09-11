import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook } from '@testing-library/react';
import { createAdminQueryClient, shouldRetryAdminQuery } from '../app/react-query-provider';
import { AdminHttpError } from '../app/http/http-client';
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
