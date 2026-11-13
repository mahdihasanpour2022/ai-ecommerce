import { z } from 'zod';

const persianNamePattern =
  /^[\u0621-\u063A\u0641-\u064A\u067E\u0686\u0698\u06A9\u06AF\u06CC]+(?:[ \u200C][\u0621-\u063A\u0641-\u064A\u067E\u0686\u0698\u06A9\u06AF\u06CC]+)*$/u;

const englishNamePattern = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/u;

export const productSizeSchema = z.object({
  persianName: z
    .string()
    .trim()
    .min(1, 'نام فارسی سایز را وارد کنید.')
    .max(80, 'نام فارسی سایز نمی‌تواند بیشتر از ۸۰ کاراکتر باشد.')
    .regex(persianNamePattern, 'نام فارسی فقط می‌تواند شامل حروف فارسی و فاصله باشد.'),
  englishName: z
    .string()
    .trim()
    .min(1, 'نام انگلیسی سایز را وارد کنید.')
    .max(80, 'نام انگلیسی سایز نمی‌تواند بیشتر از ۸۰ کاراکتر باشد.')
    .regex(englishNamePattern, 'نام انگلیسی فقط می‌تواند شامل حروف و اعداد انگلیسی با خط تیره باشد.'),
});

export type ProductSizeFormValues = z.infer<typeof productSizeSchema>;
