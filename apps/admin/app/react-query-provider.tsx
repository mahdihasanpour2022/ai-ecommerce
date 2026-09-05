'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, isServer } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AdminHttpError } from './http/http-client';

const THREE_MINUTES = 3 * 60 * 1_000;
const FIVE_MINUTES = 5 * 60 * 1_000;
const MAX_QUERY_RETRIES = 2;

export function shouldRetryAdminQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_QUERY_RETRIES || !(error instanceof AdminHttpError)) return false;
  return (
    error.kind === 'network' ||
    error.kind === 'timeout' ||
    (error.kind === 'http' && error.status !== null && error.status >= 500)
  );
}

export function createAdminQueryClient(): QueryClient {
  const runningNodeTests = process.env.NODE_TEST_CONTEXT !== undefined;
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: THREE_MINUTES,
        gcTime: FIVE_MINUTES,
        refetchOnWindowFocus: false,
        retry: runningNodeTests ? false : shouldRetryAdminQuery,
      },
      mutations: { retry: false },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient(): QueryClient {
  if (isServer || process.env.NODE_ENV === 'test' || process.env.NODE_TEST_CONTEXT !== undefined) {
    return createAdminQueryClient();
  }
  browserQueryClient ??= createAdminQueryClient();
  return browserQueryClient;
}

export function ReactQueryProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [queryClient] = useState(getQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' ? (
        <div dir="ltr">
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
        </div>
      ) : null}
    </QueryClientProvider>
  );
}
