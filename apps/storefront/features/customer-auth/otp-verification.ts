import { z } from 'zod';
import { AppRoutes } from '../../constants/appRoues';
import type { OtpVerificationResult } from './customer-auth';

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
let requestedMobile: string | null = null;

// ارقام ورودی کد را بدون تغییر معنا به معادل لاتین تبدیل می‌کند.
export function normalizeOtpDigits(value: string): string {
  return value
    .replace(/[۰-۹]/gu, (digit) => String(PERSIAN_DIGITS.indexOf(digit)))
    .replace(/[٠-٩]/gu, (digit) => String(ARABIC_DIGITS.indexOf(digit)));
}

// ورودی تعاملی را برای paste و ویرایش به شش رقم محدود می‌کند.
export function normalizeOtpInput(value: string): string {
  return normalizeOtpDigits(value).replace(/\D/gu, '').slice(0, 6);
}

// schema فقط payload شش‌رقمی قابل ارسال به Backend را تولید می‌کند.
export const otpVerificationSchema = z.object({
  code: z
    .string()
    .min(1, 'کد تأیید را وارد کنید.')
    .transform(normalizeOtpDigits)
    .refine((code) => /^\d{6}$/u.test(code), {
      message: 'کد تأیید باید دقیقاً شش رقم باشد.',
    }),
});

export type OtpVerificationFormInput = z.input<typeof otpVerificationSchema>;
export type OtpVerificationFormValues = z.output<typeof otpVerificationSchema>;

// زمان باقی‌مانده را فقط از timestamp معتبر سرور محاسبه می‌کند.
function remainingSeconds(timestamp: string, now: number): number {
  const target = Date.parse(timestamp);
  if (!Number.isFinite(target)) return 0;
  return Math.max(0, Math.ceil((target - now) / 1000));
}

// وضعیت انقضا و ارسال مجدد را از دو زمان مستقل سرور می‌سازد.
export function getOtpTiming(expiresAt: string, resendAvailableAt: string, now: number) {
  const expiresInSeconds = remainingSeconds(expiresAt, now);
  const resendInSeconds = remainingSeconds(resendAvailableAt, now);
  return {
    expiresInSeconds,
    resendInSeconds,
    isExpired: expiresInSeconds === 0,
    canResend: resendInSeconds === 0,
  } as const;
}

// ثانیه‌های باقی‌مانده را به نمایش پایدار دقیقه و ثانیه تبدیل می‌کند.
export function formatOtpCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

// شماره درخواست فعلی را فقط در حافظه فرایند برای resend نگه می‌دارد.
export function rememberRequestedOtpMobile(mobile: string): void {
  requestedMobile = mobile;
}

export function readRequestedOtpMobile(): string | null {
  return requestedMobile;
}

export function clearRequestedOtpMobile(): void {
  requestedMobile = null;
}

// مقصد پس از اثبات موبایل را بر اساس شاخه صریح Backend انتخاب می‌کند.
export function otpVerificationDestination(
  nextStep: OtpVerificationResult['nextStep'],
  returnTo: string,
): string {
  if (nextStep === 'AUTHENTICATED') return returnTo;
  return returnTo === AppRoutes.home
    ? AppRoutes.registerAuth
    : `${AppRoutes.registerAuth}?returnTo=${encodeURIComponent(returnTo)}`;
}
