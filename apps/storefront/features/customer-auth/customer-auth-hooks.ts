'use client';

import type { ApiResponse } from '@/app/http/api-response';
import { ApiRoutes } from '@/constants/apiRoues';
import { useRQFetcher } from '@/hooks/rq_hooks/useRQFetcher';
import { useRQSender } from '@/hooks/rq_hooks/useRQSender';
import { useQueryClient } from '@tanstack/react-query';
import { useCustomerAuth } from './auth-provider';
import type {
  CustomerAuthFlow,
  CustomerAuthResponse,
  CustomerRegistrationResult,
  OtpRequestResult,
  OtpVerificationResult,
} from './customer-auth';
import { customerQueryKeys } from './customer-auth';

// مرحله جریان را با پاسخ no-store سرور به‌عنوان مرجع مسیر دریافت می‌کند.
export function useCustomerAuthFlow() {
  return useRQFetcher<CustomerAuthResponse<CustomerAuthFlow>>({
    queryKey: customerQueryKeys.flow,
    url: ApiRoutes.customerAuth.flow,
    paginate: false,
    staleTime: 0,
    retry: false,
  });
}

// نتیجه غیرحساس ارسال کد را برای guard همان جریان در cache هماهنگ می‌کند.
export function useRequestCustomerOtp() {
  const queryClient = useQueryClient();
  return useRQSender<CustomerAuthResponse<OtpRequestResult>, { readonly mobile: string }>({
    request: {
      method: 'post',
      url: ApiRoutes.customerAuth.requestOtp,
      body: ({ mobile }) => ({ mobile }),
    },
    onSuccess(response) {
      queryClient.setQueryData(customerQueryKeys.flow, response);
    },
  });
}

// پس از تأیید، فقط snapshot مشتری یا تغییر مرحله را با state محلی هماهنگ می‌کند.
export function useVerifyCustomerOtp() {
  const queryClient = useQueryClient();
  const { acceptCustomer } = useCustomerAuth();
  return useRQSender<CustomerAuthResponse<OtpVerificationResult>, { readonly code: string }>({
    request: {
      method: 'post',
      url: ApiRoutes.customerAuth.verifyOtp,
      body: ({ code }) => ({ code }),
    },
    async onSuccess(response) {
      if (response.singleResult.nextStep === 'AUTHENTICATED') {
        acceptCustomer(response.singleResult.customer);
      }
      await queryClient.invalidateQueries({ queryKey: customerQueryKeys.flow });
    },
  });
}

// ثبت‌نام موفق را بدون دریافت grant یا credential به نشست حافظه‌ای منتقل می‌کند.
export function useRegisterCustomer() {
  const queryClient = useQueryClient();
  const { acceptCustomer } = useCustomerAuth();
  return useRQSender<
    CustomerAuthResponse<CustomerRegistrationResult>,
    { readonly firstName: string; readonly lastName: string }
  >({
    request: {
      method: 'post',
      url: ApiRoutes.customerAuth.register,
      body: ({ firstName, lastName }) => ({ firstName, lastName }),
    },
    async onSuccess(response) {
      acceptCustomer(response.singleResult.customer);
      await queryClient.invalidateQueries({ queryKey: customerQueryKeys.flow });
    },
  });
}

// Logout را با CSRF نشست جاری ارسال و داده‌های حوزه مشتری را پاک می‌کند.
export function useLogoutCustomer() {
  const { clearCustomer } = useCustomerAuth();
  return useRQSender<ApiResponse<null, null, null>, void>({
    request: {
      method: 'post',
      url: ApiRoutes.customerAuth.logout,
      axiosConfig: { customerAuth: { csrf: true } },
    },
    onSuccess: clearCustomer,
  });
}
