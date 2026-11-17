'use client';

import { UiButton, UiP } from '@/components/shared/ui';
import { AppRoutes } from '@/constants/appRoues';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { safeReturnDestination } from './customer-auth';
import { useCustomerAuthFlow } from './customer-auth-hooks';

const STAGE_ROUTES = {
  MOBILE_REQUIRED: AppRoutes.auth,
  OTP_PENDING: AppRoutes.verifyAuth,
  REGISTRATION_REQUIRED: AppRoutes.registerAuth,
} as const;

// محتوای هر مسیر auth را فقط پس از تطبیق با مرحله معتبر Backend نمایش می‌دهد.
export function AuthFlowGuard({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const flowQuery = useCustomerAuthFlow();
  const flow = flowQuery.data?.singleResult;
  const returnTo = safeReturnDestination(searchParams.get('returnTo'));
  const destinationPath =
    flow?.stage === 'AUTHENTICATED' ? returnTo : flow ? STAGE_ROUTES[flow.stage] : null;
  const destination =
    destinationPath !== null && flow?.stage !== 'AUTHENTICATED' && returnTo !== AppRoutes.home
      ? `${destinationPath}?returnTo=${encodeURIComponent(returnTo)}`
      : destinationPath;

  // مرحله معتبر Backend را به تنها مسیر مجاز آن canonicalize می‌کند.
  useEffect(() => {
    if (destination !== null && destinationPath !== pathname) router.replace(destination);
  }, [destination, destinationPath, pathname, router]);

  if (flowQuery.isError) {
    return (
      <main
        dir="rtl"
        className="flex min-h-dvh items-center justify-center bg-background p-4 sm:p-6"
      >
        <section className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
          <UiP role="alert" className="text-danger">
            {flowQuery.error.message}
          </UiP>
          <UiButton
            type="button"
            size="medium"
            className="mt-6 bg-nice-red text-white"
            loading={flowQuery.isFetching}
            onClick={() => void flowQuery.refetch()}
          >
            تلاش مجدد
          </UiButton>
        </section>
      </main>
    );
  }

  return destinationPath === pathname ? children : null;
}
