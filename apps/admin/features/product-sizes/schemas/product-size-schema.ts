import { z } from 'zod';

const englishNamePattern = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/u;

export const productSizeSchema = z.object({
  englishName: z
    .string()
    .trim()
    .min(1, 'نام انگلیسی سایز را وارد کنید.')
    .max(80, 'نام انگلیسی سایز نمی‌تواند بیشتر از ۸۰ کاراکتر باشد.')
    .regex(englishNamePattern, 'نام انگلیسی فقط می‌تواند شامل حروف و اعداد انگلیسی با خط تیره باشد.'),
});

export type ProductSizeFormValues = z.infer<typeof productSizeSchema>;
