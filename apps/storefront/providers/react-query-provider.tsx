'use client';

import { environmentManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';
import { StorefrontHttpError } from '../app/http/http-client';

const THREE_MINUTES = 3 * 60 * 1_000;
const FIVE_MINUTES = 5 * 60 * 1_000;
const MAX_QUERY_RETRIES = 2;

// فقط خواندن‌های ناموفق موقت را با تعداد محدود دوباره اجرا می‌کند.
export function shouldRetryStorefrontQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_QUERY_RETRIES || !(error instanceof StorefrontHttpError)) return false;
  return (
    error.kind === 'network' ||
    error.kind === 'timeout' ||
    (error.kind === 'http' && error.status !== null && error.status >= 500)
  );
}

// تنظیمات cache و retry مشترک همه feature hookهای Storefront را ایجاد می‌کند.
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

let browserQueryClient: QueryClient | undefined;

// cache مرورگر را پایدار نگه می‌دارد ولی برای هر render سرور cache مستقل می‌سازد.
function getQueryClient(): QueryClient {
  if (environmentManager.isServer()) return createStorefrontQueryClient();
  browserQueryClient ??= createStorefrontQueryClient();
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
