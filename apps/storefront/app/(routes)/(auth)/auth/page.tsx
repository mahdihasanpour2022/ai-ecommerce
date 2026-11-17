'use client';

import { UiButton, UiHeading, UiInputTextField, UiP } from '@/components/shared/ui';
import { AppRoutes } from '@/constants/appRoues';
import { safeReturnDestination } from '@/features/customer-auth/customer-auth';
import { useRequestCustomerOtp } from '@/features/customer-auth/customer-auth-hooks';
import {
  mobileEntrySchema,
  type MobileEntryFormInput,
  type MobileEntryFormValues,
} from '@/features/customer-auth/mobile-entry';
import { rememberRequestedOtpMobile } from '@/features/customer-auth/otp-verification';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRef } from 'react';
import { useForm } from 'react-hook-form';

// فرم ورود موبایل را با اعتبارسنجی محلی و قرارداد موجود درخواست OTP هماهنگ می‌کند.
export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestOtp = useRequestCustomerOtp();
  const submissionInFlight = useRef(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MobileEntryFormInput, unknown, MobileEntryFormValues>({
    resolver: zodResolver(mobileEntrySchema),
    defaultValues: { mobile: '' },
  });

  const returnTo = safeReturnDestination(searchParams.get('returnTo'));
  const verifyDestination =
    returnTo === AppRoutes.home
      ? AppRoutes.verifyAuth
      : `${AppRoutes.verifyAuth}?returnTo=${encodeURIComponent(returnTo)}`;

  // قفل حافظه‌ای مانع ارسال هم‌زمان درخواست از کلیک یا Enter تکراری می‌شود.
  const submitMobile = async ({ mobile }: MobileEntryFormValues) => {
    if (submissionInFlight.current) return;
    submissionInFlight.current = true;

    try {
      await requestOtp.mutateAsync({ mobile });
      rememberRequestedOtpMobile(mobile);
      router.push(verifyDestination);
    } catch {
      // پیام امن خطا از state استاندارد mutation در خود فرم نمایش داده می‌شود.
    } finally {
      submissionInFlight.current = false;
    }
  };

  const isBusy = isSubmitting || requestOtp.isPending;

  return (
    <main
      dir="rtl"
      className="flex min-h-dvh items-center justify-center bg-background p-4 sm:p-6"
    >
      <section
        aria-labelledby="auth-heading"
        className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8"
      >
        <UiHeading id="auth-heading" className="text-center text-foreground">
          ورود یا ثبت‌نام
        </UiHeading>
        <UiP className="mt-2 text-center text-muted">
          برای دریافت کد تأیید، شماره موبایل خود را وارد کنید.
        </UiP>

        <form
          className="mt-8 space-y-6"
          noValidate
          onSubmit={(event) => void handleSubmit(submitMobile)(event)}
        >
          <UiInputTextField
            {...register('mobile')}
            id="mobile"
            type="text"
            label="شماره موبایل"
            required
            autoComplete="tel"
            autoFocus
            inputMode="tel"
            dir="ltr"
            placeholder="09123456789"
            errorMessage={errors.mobile?.message}
          />

          {requestOtp.error ? (
            <UiP role="alert" className="text-danger">
              {requestOtp.error.message}
            </UiP>
          ) : null}

          <UiButton
            type="submit"
            size="medium"
            loading={isBusy}
            className="bg-nice-red text-white"
          >
            {isBusy ? 'در حال ارسال کد' : 'دریافت کد تأیید'}
          </UiButton>
        </form>
      </section>
    </main>
  );
}
