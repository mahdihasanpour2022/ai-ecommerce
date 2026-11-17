'use client';

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

  return destinationPath === pathname ? children : null;
}
