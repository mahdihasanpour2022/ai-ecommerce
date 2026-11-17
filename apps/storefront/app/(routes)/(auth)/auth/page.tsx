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
import { toast } from 'sonner';

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
    } catch (error) {
      // پیام امن خطای استاندارد را بدون نمایش متن داخل فرم به کاربر اطلاع می‌دهد.
      toast.error(error instanceof Error ? error.message : 'خطای داخلی سرور رخ داد.', {
        duration: 2_000,
      });
    } finally {
      submissionInFlight.current = false;
    }
  };

  const isBusy = isSubmitting || requestOtp.isPending;

  return (
    <main dir="rtl" className="bg-background flex min-h-dvh items-center justify-center p-4 sm:p-6">
      <section
        aria-labelledby="auth-heading"
        className="border-border bg-surface w-full max-w-md rounded-xl border p-6 shadow-sm sm:p-8"
      >
        <UiHeading id="auth-heading" className="text-foreground text-center">
          ورود یا ثبت‌نام
        </UiHeading>
        <UiP className="text-muted mt-2 text-center">
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
            placeholder="0912 *******"
            errorMessage={errors.mobile?.message}
          />

          <UiButton
            type="submit"
            size="medium"
            disabled={isBusy}
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
