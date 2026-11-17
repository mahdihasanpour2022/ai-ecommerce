import { z } from 'zod';

const CUSTOMER_NAME_MIN_LENGTH = 2;
const CUSTOMER_NAME_MAX_LENGTH = 50;
const CUSTOMER_NAME_PATTERN = /^[\p{L}\p{M}]+(?:[ '\u200C’-][\p{L}\p{M}]+)*$/u;

// فاصله‌ها و شکل یونیکد نام را بدون تغییر حروف و نیم‌فاصله یکدست می‌کند.
export function normalizeCustomerName(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/gu, ' ');
}

// اعتبارسنجی هر بخش نام را با همان طول و نویسه‌های پذیرفته‌شده Backend می‌سازد.
function customerNameSchema(label: string) {
  return z
    .string()
    .transform(normalizeCustomerName)
    .superRefine((value, context) => {
      if (!value) {
        context.addIssue({ code: 'custom', message: `${label} را وارد کنید.` });
        return;
      }
      const length = Array.from(value).length;
      if (
        length < CUSTOMER_NAME_MIN_LENGTH ||
        length > CUSTOMER_NAME_MAX_LENGTH ||
        !CUSTOMER_NAME_PATTERN.test(value)
      ) {
        context.addIssue({ code: 'custom', message: `${label} واردشده معتبر نیست.` });
      }
    });
}

export const customerRegistrationSchema = z.object({
  firstName: customerNameSchema('نام'),
  lastName: customerNameSchema('نام خانوادگی'),
});

export type CustomerRegistrationFormInput = z.input<typeof customerRegistrationSchema>;
export type CustomerRegistrationFormValues = z.output<typeof customerRegistrationSchema>;
