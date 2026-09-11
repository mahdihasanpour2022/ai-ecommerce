import { z } from 'zod';

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/u;
const PASSWORD_PATTERN = /^[0-9]{6}$/u;
const emailSchema = z.email();

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .toLowerCase()
    .refine(
      (value) => emailSchema.safeParse(value).success || USERNAME_PATTERN.test(value),
      'ایمیل معتبر یا نام کاربری ۳ تا ۲۰ کاراکتری شامل حروف انگلیسی، عدد یا _ وارد کنید.',
    ),
  password: z.string().regex(PASSWORD_PATTERN, 'رمز عبور باید دقیقاً ۶ رقم انگلیسی باشد.'),
});

export type LoginValues = z.infer<typeof loginSchema>;
