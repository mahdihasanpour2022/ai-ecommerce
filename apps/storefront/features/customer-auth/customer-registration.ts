import { z } from 'zod';

const CUSTOMER_NAME_MIN_LENGTH = 2;
const CUSTOMER_NAME_MAX_LENGTH = 50;
const PERSIAN_LETTERS =
  '\u0621-\u063A\u0641-\u064A\u066E-\u066F\u0671-\u06D3\u06FA-\u06FC\u06FF';
const CUSTOMER_NAME_PATTERN = new RegExp(
  `^[${PERSIAN_LETTERS}]+(?: [${PERSIAN_LETTERS}]+)*$`,
  'u',
);
const CUSTOMER_NAME_START_PATTERN = new RegExp(`^[${PERSIAN_LETTERS}]`, 'u');
const INVALID_CUSTOMER_NAME_CHARACTER_PATTERN = new RegExp(`[^${PERSIAN_LETTERS} ]`, 'gu');

// فاصله‌ها و شکل یونیکد نام را بدون تغییر حروف و نیم‌فاصله یکدست می‌کند.
export function normalizeCustomerName(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/gu, ' ');
}

// نویسه‌های نام را هنگام ورود به حروف فارسی و یک فاصلهٔ داخلی محدود می‌کند.
export function sanitizeCustomerNameInput(value: string): string {
  return value
    .normalize('NFC')
    .replace(INVALID_CUSTOMER_NAME_CHARACTER_PATTERN, '')
    .replace(/^ +/u, '')
    .replace(/ {2,}/gu, ' ');
}

// اعتبارسنجی هر بخش نام را با طول مجاز و نویسه‌های فارسی پذیرفته‌شده می‌سازد.
function customerNameSchema(label: string) {
  return z
    .string()
    .superRefine((input, context) => {
      const value = normalizeCustomerName(input);
      if (!value) {
        context.addIssue({ code: 'custom', message: `${label} را وارد کنید.` });
        return;
      }
      const length = Array.from(value).length;
      if (
        length < CUSTOMER_NAME_MIN_LENGTH ||
        length > CUSTOMER_NAME_MAX_LENGTH ||
        !CUSTOMER_NAME_START_PATTERN.test(input) ||
        !CUSTOMER_NAME_PATTERN.test(value)
      ) {
        context.addIssue({ code: 'custom', message: `${label} واردشده معتبر نیست.` });
      }
    })
    .transform(normalizeCustomerName);
}

export const customerRegistrationSchema = z.object({
  firstName: customerNameSchema('نام'),
  lastName: customerNameSchema('نام خانوادگی'),
});

export type CustomerRegistrationFormInput = z.input<typeof customerRegistrationSchema>;
export type CustomerRegistrationFormValues = z.output<typeof customerRegistrationSchema>;
