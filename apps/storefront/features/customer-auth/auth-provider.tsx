'use client';

import {
  StorefrontHttpError,
  httpClient,
  onTerminalCustomerAuthenticationLoss,
} from '@/app/http/http-client';
import { ApiRoutes } from '@/constants/apiRoues';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { CustomerAuthResponse, CustomerSnapshot } from './customer-auth';
import { customerQueryKeys } from './customer-auth';

type CustomerAuthStatus = 'anonymous' | 'authenticated' | 'loading' | 'unavailable';

interface CustomerAuthContextValue {
  readonly customer: CustomerSnapshot | null;
  readonly status: CustomerAuthStatus;
  readonly acceptCustomer: (customer: CustomerSnapshot) => void;
  readonly clearCustomer: () => void;
}

interface BootstrapResult {
  readonly customer: CustomerSnapshot;
  readonly csrfToken?: string;
}

const CustomerAuthContext = createContext<CustomerAuthContextValue | null>(null);
let bootstrapPromise: Promise<CustomerSnapshot> | null = null;

// Bootstrap هم‌زمان را بین mountهای مرورگر مشترک نگه می‌دارد تا نشست دوبار نچرخد.
function bootstrapCustomer(): Promise<CustomerSnapshot> {
  bootstrapPromise ??= httpClient
    .post<CustomerAuthResponse<BootstrapResult>>(ApiRoutes.customerAuth.bootstrap)
    .then((response) => response.data.singleResult.customer)
    .finally(() => {
      bootstrapPromise = null;
    });
  return bootstrapPromise;
}

// snapshot نشست مشتری را در حافظه نگه می‌دارد و هیچ credentialی را persist نمی‌کند.
export function CustomerAuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const queryClient = useQueryClient();
  const customerId = useRef<string | null>(null);
  const [customer, setCustomer] = useState<CustomerSnapshot | null>(null);
  const [status, setStatus] = useState<CustomerAuthStatus>('loading');

  // داده‌های وابسته به هویت قبلی را پیش از پذیرش نشست تازه حذف می‌کند.
  const acceptCustomer = useCallback(
    (nextCustomer: CustomerSnapshot) => {
      if (customerId.current !== null && customerId.current !== nextCustomer.id) {
        queryClient.removeQueries({ queryKey: customerQueryKeys.all });
      }
      customerId.current = nextCustomer.id;
      setCustomer(nextCustomer);
      setStatus('authenticated');
    },
    [queryClient],
  );

  // با پایان قطعی نشست، فقط cacheهای حوزه مشتری و snapshot احراز هویت را پاک می‌کند.
  const clearCustomer = useCallback(() => {
    customerId.current = null;
    queryClient.removeQueries({ queryKey: customerQueryKeys.all });
    queryClient.removeQueries({ queryKey: customerQueryKeys.flow });
    setCustomer(null);
    setStatus('anonymous');
  }, [queryClient]);

  useEffect(() => onTerminalCustomerAuthenticationLoss(clearCustomer), [clearCustomer]);

  useEffect(() => {
    let active = true;
    bootstrapCustomer().then(
      (nextCustomer) => {
        if (active) acceptCustomer(nextCustomer);
      },
      (error: unknown) => {
        if (!active) return;
        if (
          error instanceof StorefrontHttpError &&
          error.kind === 'http' &&
          [
            'AUTHENTICATION_REQUIRED',
            'CUSTOMER_ACCOUNT_DISABLED',
            'REFRESH_TOKEN_EXPIRED',
            'REFRESH_TOKEN_INVALID',
            'REFRESH_TOKEN_REUSED',
          ].includes(error.code)
        ) {
          customerId.current = null;
          queryClient.removeQueries({ queryKey: customerQueryKeys.all });
          setCustomer(null);
          setStatus('anonymous');
        } else {
          setStatus('unavailable');
        }
      },
    );
    return () => {
      active = false;
    };
  }, [acceptCustomer, queryClient]);

  return (
    <CustomerAuthContext.Provider value={{ customer, status, acceptCustomer, clearCustomer }}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth(): CustomerAuthContextValue {
  const context = useContext(CustomerAuthContext);
  if (!context) throw new Error('useCustomerAuth must be used within CustomerAuthProvider.');
  return context;
}
