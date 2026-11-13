'use client';

import { environmentManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';
import { createStorefrontQueryClient } from './storefront-query-client';

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
