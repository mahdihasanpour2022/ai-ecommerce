import type { ApiResponse } from '@/app/http/api-response';
import { AppRoutes } from '../../constants/appRoues';

export interface CustomerSnapshot {
  readonly id: string;
  readonly mobile: string;
  readonly firstName: string;
  readonly lastName: string;
}

export type CustomerAuthFlow =
  | { readonly stage: 'MOBILE_REQUIRED' }
  | {
      readonly stage: 'OTP_PENDING';
      readonly maskedMobile: string;
      readonly expiresAt: string;
      readonly resendAvailableAt: string;
    }
  | { readonly stage: 'REGISTRATION_REQUIRED'; readonly expiresAt: string }
  | { readonly stage: 'AUTHENTICATED' };

export interface OtpRequestResult {
  readonly stage: 'OTP_PENDING';
  readonly maskedMobile: string;
  readonly expiresAt: string;
  readonly resendAvailableAt: string;
}

export type OtpVerificationResult =
  | { readonly nextStep: 'AUTHENTICATED'; readonly customer: CustomerSnapshot }
  | { readonly nextStep: 'REGISTRATION_REQUIRED' };

export interface CustomerRegistrationResult {
  readonly nextStep: 'AUTHENTICATED';
  readonly redirectTo: '/';
  readonly customer: CustomerSnapshot;
}

export type CustomerAuthResponse<SingleResult> = ApiResponse<null, SingleResult, null>;

export const customerQueryKeys = {
  all: ['customer'] as const,
  flow: ['customer-auth-flow'] as const,
};

// مقصد بازگشت را به مسیر داخلی و غیرمرتبط با فرم‌های احراز هویت محدود می‌کند.
export function safeReturnDestination(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return AppRoutes.home;
  }
  try {
    const url = new URL(value, 'http://storefront.local');
    if (
      url.origin !== 'http://storefront.local' ||
      url.pathname === AppRoutes.auth ||
      url.pathname.startsWith(`${AppRoutes.auth}/`)
    ) {
      return AppRoutes.home;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return AppRoutes.home;
  }
}

// مقصد ورود را فقط از مسیر بازگشتِ پالایش‌شده می‌سازد تا ورودی ناامن به Router نرسد.
export function customerAuthDestination(value: string | null | undefined): string {
  const returnTo = safeReturnDestination(value);
  return returnTo === AppRoutes.home
    ? AppRoutes.auth
    : `${AppRoutes.auth}?returnTo=${encodeURIComponent(returnTo)}`;
}
