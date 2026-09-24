import { z } from 'zod';

const optionalPrice = z
  .string()
  .trim()
  .refine((value) => value === '' || /^[1-9][0-9]*$/u.test(value), 'قیمت باید یک عدد مثبت باشد.')
  .refine((value) => value === '' || Number.isSafeInteger(Number(value)), 'مقدار قیمت معتبر نیست.')
  .refine((value) => value === '' || Number(value) % 10 === 0, 'قیمت باید مضربی از ۱۰ ریال باشد.');

const optionalIsoDateTime = z
  .string()
  .refine(
    (value) => {
      if (value === '') return true;
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) return false;
      const date = new Date(value);
      return !Number.isNaN(date.valueOf()) && date.toISOString() === value;
    },
    'تاریخ و ساعت انتخاب‌شده معتبر نیست.',
  );

export const productFilterSchema = z
  .object({
    name: z.string().trim().max(200, 'نام محصول حداکثر ۲۰۰ نویسه است.'),
    categoryId: z.string(),
    size: z.string(),
    color: z.string(),
    status: z.enum(['', 'DRAFT', 'ACTIVE', 'ARCHIVED']),
    availability: z.enum(['', 'IN_STOCK', 'OUT_OF_STOCK']),
    createdFrom: optionalIsoDateTime,
    createdTo: optionalIsoDateTime,
    minimumPriceRial: optionalPrice,
    maximumPriceRial: optionalPrice,
  })
  .superRefine((values, context) => {
    if (
      values.createdFrom &&
      values.createdTo &&
      new Date(values.createdFrom).valueOf() > new Date(values.createdTo).valueOf()
    ) {
      context.addIssue({
        code: 'custom',
        path: ['createdTo'],
        message: 'تاریخ پایان باید برابر یا بعد از تاریخ شروع باشد.',
      });
    }
    if (
      values.minimumPriceRial &&
      values.maximumPriceRial &&
      Number(values.minimumPriceRial) > Number(values.maximumPriceRial)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['maximumPriceRial'],
        message: 'حداکثر قیمت باید برابر یا بیشتر از حداقل قیمت باشد.',
      });
    }
  });

export type ProductFilterFormValues = z.infer<typeof productFilterSchema>;
