import { z } from 'zod';

const persianNamePattern =
  /^[\u0621-\u063A\u0641-\u064A\u067E\u0686\u0698\u06A9\u06AF\u06CC]+(?:[ \u200C][\u0621-\u063A\u0641-\u064A\u067E\u0686\u0698\u06A9\u06AF\u06CC]+)*$/u;

export const productColorSchema = z.object({
  persianName: z
    .string()
    .trim()
    .min(1, 'نام فارسی رنگ را وارد کنید.')
    .max(80, 'نام فارسی رنگ نمی‌تواند بیشتر از ۸۰ کاراکتر باشد.')
    .regex(persianNamePattern, 'نام فارسی فقط می‌تواند شامل حروف فارسی و فاصله باشد.'),
  englishName: z
    .string()
    .trim()
    .min(1, 'نام انگلیسی رنگ را وارد کنید.')
    .max(80, 'نام انگلیسی رنگ نمی‌تواند بیشتر از ۸۰ کاراکتر باشد.')
    .regex(/^[A-Za-z]+$/u, 'نام انگلیسی فقط می‌تواند شامل حروف انگلیسی باشد.'),
  hexCode: z.string().regex(/^#[0-9A-Fa-f]{6}$/u, 'کد رنگ معتبر نیست.'),
});

export type ProductColorFormValues = z.infer<typeof productColorSchema>;
