import { z } from 'zod';

const englishTagPattern = /^[a-z]+(?:_[a-z]+)*$/u;

export const productTagSchema = z.object({
  englishName: z
    .string()
    .trim()
    .min(1, 'نام انگلیسی برچسب را وارد کنید.')
    .max(80, 'نام انگلیسی برچسب نمی‌تواند بیشتر از ۸۰ کاراکتر باشد.')
    .regex(
      englishTagPattern,
      'فقط حروف کوچک انگلیسی مجاز است و کلمات باید با _ به هم متصل شوند.',
    ),
});

export type ProductTagFormValues = z.infer<typeof productTagSchema>;
