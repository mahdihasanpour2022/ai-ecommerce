import { z } from 'zod';

export const createCategorySchema = z.object({
  image: z.custom<File>((value) => typeof File !== 'undefined' && value instanceof File, {
    message: 'تصویر دسته‌بندی را انتخاب کنید.',
  }),
  name: z
    .string()
    .trim()
    .min(1, 'نام دسته‌بندی را وارد کنید.')
    .max(120, 'نام دسته‌بندی نمی‌تواند بیشتر از ۱۲۰ کاراکتر باشد.'),
  parentId: z.union([z.literal(''), z.uuid('دسته‌بندی والد معتبر نیست.')]),
});

export type CreateCategoryFormValues = z.infer<typeof createCategorySchema>;
