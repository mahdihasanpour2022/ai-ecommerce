import { z } from 'zod';

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const IRANIAN_MOBILE_PATTERN = /^(?:09\d{9}|\+989\d{9}|00989\d{9})$/u;

// ارقام فارسی و عربی را فقط برای اعتبارسنجی و payload به ارقام لاتین تبدیل می‌کند.
export function normalizeMobileDigits(value: string): string {
  return value
    .trim()
    .replace(/[۰-۹]/gu, (digit) => String(PERSIAN_DIGITS.indexOf(digit)))
    .replace(/[٠-٩]/gu, (digit) => String(ARABIC_DIGITS.indexOf(digit)));
}

// schema ورودی‌های رایج شماره ایران را می‌پذیرد و نوع payload نهایی را تولید می‌کند.
export const mobileEntrySchema = z.object({
  mobile: z
    .string()
    .trim()
    .min(1, 'شماره موبایل را وارد کنید.')
    .transform(normalizeMobileDigits)
    .refine((mobile) => IRANIAN_MOBILE_PATTERN.test(mobile), {
      message: 'شماره موبایل معتبر نیست.',
    }),
});

export type MobileEntryFormInput = z.input<typeof mobileEntrySchema>;
export type MobileEntryFormValues = z.output<typeof mobileEntrySchema>;
