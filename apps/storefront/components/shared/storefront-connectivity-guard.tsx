'use client';

import { httpClient, StorefrontHttpError } from '@/app/http/http-client';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { UiButton } from './ui';
import { UiLoading } from './ui-loading';

type ConnectionStatus = 'checking' | 'offline' | 'online';
const CONNECTIVITY_CHECK_PATH = '/catalog/categories';

function isConnectionFailure(error: unknown): boolean {
  return (
    error instanceof StorefrontHttpError &&
    (error.kind === 'network' ||
      error.kind === 'timeout' ||
      (error.status === 502 && error.code === 'BACKEND_UNAVAILABLE'))
  );
}

export function StorefrontConnectivityGuard({ children }: Readonly<{ children: ReactNode }>) {
  const queryClient = useQueryClient();
  const attemptRef = useRef(0);
  const [status, setStatus] = useState<ConnectionStatus>('checking');
  const [isRetrying, setIsRetrying] = useState(false);

  const checkConnection = useCallback(
    async (retry = false) => {
      const attempt = ++attemptRef.current;
      if (retry) setIsRetrying(true);

      if (!navigator.onLine) {
        setStatus('offline');
        setIsRetrying(false);
        return;
      }

      try {
        await httpClient.get(CONNECTIVITY_CHECK_PATH, {
          params: { page: 1, pageSize: 1 },
          timeout: 8_000,
        });
        if (attempt !== attemptRef.current) return;

        await queryClient.invalidateQueries();
        setStatus('online');
      } catch (error) {
        if (attempt !== attemptRef.current) return;
        setStatus(isConnectionFailure(error) ? 'offline' : 'online');
      } finally {
        if (attempt === attemptRef.current) setIsRetrying(false);
      }
    },
    [queryClient],
  );

  useEffect(() => {
    const initialCheckTimer = window.setTimeout(() => void checkConnection(), 0);

    const handleOffline = () => {
      attemptRef.current += 1;
      setIsRetrying(false);
      setStatus('offline');
    };
    const handleOnline = () => void checkConnection(true);

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      attemptRef.current += 1;
      window.clearTimeout(initialCheckTimer);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [checkConnection]);

  if (status === 'checking') {
    return <UiLoading fullscreen message="در حال بررسی اتصال..." />;
  }

  if (status === 'offline') {
    return (
      <div
        className="fixed inset-0 z-50 flex min-h-dvh items-center justify-center bg-background p-5 sm:p-8"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="offline-title"
        aria-describedby="offline-description"
      >
        <div className="flex w-full max-w-md flex-col items-center rounded-2xl border border-border bg-surface p-6 text-center shadow-lg sm:p-10">
          <div
            className="mb-5 flex size-16 items-center justify-center rounded-full bg-surface-subtle text-danger"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 3l18 18M8.5 8.6A8.8 8.8 0 0112 7.9c3.1 0 6 1.3 8 3.4M5.5 11.4c.5-.5 1.1-.9 1.7-1.3M9 15a4.4 4.4 0 015.9-.3M12 19h.01" />
            </svg>
          </div>
          <h1 id="offline-title" className="m-0 text-xl font-bold text-foreground sm:text-2xl">
            شما به اینترنت دسترسی ندارید
          </h1>
          <p id="offline-description" className="mt-3 text-sm leading-7 text-muted sm:text-base">
            از اتصال خود به اینترنت مطمئن شوید و مجدداً تلاش کنید.
          </p>
          <UiButton
            className="mt-6 min-w-36 px-6 py-3"
            variant="style_5"
            size="medium"
            loading={isRetrying}
            onClick={() => void checkConnection(true)}
          >
            {isRetrying ? 'در حال بررسی...' : 'تلاش مجدد'}
          </UiButton>
        </div>
      </div>
    );
  }

  return children;
}
