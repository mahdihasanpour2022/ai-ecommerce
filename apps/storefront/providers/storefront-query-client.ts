import { QueryClient } from '@tanstack/react-query';
import { StorefrontHttpError } from '../app/http/http-client';

const THREE_MINUTES = 3 * 60 * 1_000;
const FIVE_MINUTES = 5 * 60 * 1_000;
const MAX_QUERY_RETRIES = 2;

export function shouldRetryStorefrontQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_QUERY_RETRIES || !(error instanceof StorefrontHttpError)) return false;
  return (
    error.kind === 'network' ||
    error.kind === 'timeout' ||
    (error.kind === 'http' && error.status !== null && error.status >= 500)
  );
}

export function createStorefrontQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: THREE_MINUTES,
        gcTime: FIVE_MINUTES,
        refetchOnWindowFocus: false,
        retry: shouldRetryStorefrontQuery,
      },
      mutations: { retry: false },
    },
  });
}
