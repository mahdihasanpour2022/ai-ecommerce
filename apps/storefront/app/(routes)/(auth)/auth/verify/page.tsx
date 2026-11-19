'use client';

import { UiButton, UiHeading, UiInputTextField, UiP } from '@/components/shared/ui';
import { AppRoutes } from '@/constants/appRoues';
import { safeReturnDestination } from '@/features/customer-auth/customer-auth';
import {
  useCustomerAuthFlow,
  useRequestCustomerOtp,
  useVerifyCustomerOtp,
} from '@/features/customer-auth/customer-auth-hooks';
import {
  clearRequestedOtpMobile,
  formatOtpCountdown,
  getOtpTiming,
  normalizeOtpInput,
  otpVerificationDestination,
  otpVerificationSchema,
  readRequestedOtpMobile,
  type OtpVerificationFormInput,
  type OtpVerificationFormValues,
} from '@/features/customer-auth/otp-verification';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

// فرم تأیید را به مرحله زنده سرور، زمان‌های معتبر و شاخه نهایی Backend متصل می‌کند.
export default function VerifyAuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const flowQuery = useCustomerAuthFlow();
  const verifyOtp = useVerifyCustomerOtp();
  const requestOtp = useRequestCustomerOtp();
  const submissionInFlight = useRef(false);
  const [now, setNow] = useState(() => Date.now());
  const flow = flowQuery.data?.singleResult;
  const otpFlow = flow?.stage === 'OTP_PENDING' ? flow : null;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OtpVerificationFormInput, unknown, OtpVerificationFormValues>({
    resolver: zodResolver(otpVerificationSchema),
    defaultValues: { code: '' },
  });
  const codeRegistration = register('code');
  const returnTo = safeReturnDestination(searchParams.get('returnTo'));
  const authDestination =
    returnTo === AppRoutes.home
      ? AppRoutes.auth
      : `${AppRoutes.auth}?returnTo=${encodeURIComponent(returnTo)}`;

  // نمایش زمان را تا وقتی مرحله معتبر OTP برقرار است از ساعت جاری به‌روز نگه می‌دارد.
  useEffect(() => {
    if (!otpFlow) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [otpFlow]);

  if (!otpFlow) return null;

  const timing = getOtpTiming(otpFlow.expiresAt, otpFlow.resendAvailableAt, now);
  const isVerifyBusy = isSubmitting || verifyOtp.isPending;

  // قفل حافظه‌ای ارسال هم‌زمان کد را از Enter یا کلیک تکراری مهار می‌کند.
  const submitCode = async ({ code }: OtpVerificationFormValues) => {
    if (submissionInFlight.current || timing.isExpired) return;
    submissionInFlight.current = true;
    try {
      const response = await verifyOtp.mutateAsync({ code });
      clearRequestedOtpMobile();
      router.replace(otpVerificationDestination(response.singleResult.nextStep, returnTo));
    } catch {
      // پیام امن Backend از state معیار mutation نمایش داده می‌شود.
    } finally {
      submissionInFlight.current = false;
    }
  };

  // resend فقط پس از زمان مجاز و با شماره غیرمرجع حافظه فرایند اجرا می‌شود.
  const resendCode = async () => {
    if (!timing.canResend || requestOtp.isPending) return;
    const mobile = readRequestedOtpMobile();
    if (!mobile) {
      router.replace(authDestination);
      return;
    }
    try {
      await requestOtp.mutateAsync({ mobile });
      setNow(Date.now());
    } catch {
      await flowQuery.refetch();
    }
  };

  return (
    <main dir="rtl" className="bg-background flex min-h-dvh items-center justify-center p-4 sm:p-6">
      <section
        aria-labelledby="verify-heading"
        className="border-border bg-surface w-full max-w-md rounded-xl border p-6 shadow-sm sm:p-8"
      >
        <UiHeading id="verify-heading" className="text-foreground text-center">
          تأیید شماره موبایل
        </UiHeading>
        <UiP className="text-muted mt-2 text-center">
          کد ارسال‌شده به
          <span dir="ltr" className="inline-block px-1">
            {otpFlow.maskedMobile}
          </span>
          را وارد کنید.
        </UiP>

        <form
          className="mt-8 space-y-6"
          noValidate
          onSubmit={(event) => void handleSubmit(submitCode)(event)}
        >
          <UiInputTextField
            {...codeRegistration}
            id="otp-code"
            type="text"
            label="کد تأیید"
            // description="کد را می‌توانید تایپ یا paste کنید."
            required
            autoComplete="one-time-code"
            autoFocus
            inputMode="numeric"
            dir="ltr"
            placeholder=""
            errorMessage={errors.code?.message}
            onChange={(event) => {
              event.currentTarget.value = normalizeOtpInput(event.currentTarget.value);
              void codeRegistration.onChange(event);
            }}
          />

          <div className="space-y-0" aria-live="polite">
            {!timing.isExpired ? (
              <UiP className="text-muted">
                ارسال مجدد تا {formatOtpCountdown(timing.expiresInSeconds)} دیگر
              </UiP>
            ) : (
              <UiButton
                type="button"
                size="medium"
                disabled={!timing.canResend}
                loading={requestOtp.isPending}
                onClick={() => void resendCode()}
                className="flex min-h-2! w-full items-start justify-start px-0! py-0!"
              >
                ارسال مجدد کد
              </UiButton>
            )}
          </div>

          {verifyOtp.error ? (
            <UiP role="alert" className="text-danger">
              {verifyOtp.error.message}
            </UiP>
          ) : null}
          {requestOtp.error ? (
            <UiP role="alert" className="text-danger">
              {requestOtp.error.message}
            </UiP>
          ) : null}

          <UiButton
            type="submit"
            size="medium"
            loading={isVerifyBusy}
            disabled={timing.isExpired}
            className="bg-nice-red text-white"
          >
            {isVerifyBusy ? 'در حال بررسی کد' : 'تأیید و ادامه'}
          </UiButton>
        </form>
      </section>
    </main>
  );
}
