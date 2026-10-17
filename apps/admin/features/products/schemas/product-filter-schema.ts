import { z } from 'zod';

const productTag = z
  .string()
  .trim()
  .min(1, 'تگ نمی‌تواند خالی باشد.')
  .max(80, 'هر تگ حداکثر ۸۰ نویسه است.')
  .regex(/^[a-z]+(?:_[a-z]+)*$/u, 'تگ باید با حروف کوچک انگلیسی و جداکننده زیرخط نوشته شود.');

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

const optionalDiscountPercent = z
  .string()
  .trim()
  .refine(
    (value) => value === '' || /^(?:0|[1-9][0-9]{0,2})$/u.test(value),
    'درصد تخفیف باید یک عدد صحیح بین ۰ تا ۱۰۰ باشد.',
  )
  .refine(
    (value) => value === '' || Number(value) <= 100,
    'درصد تخفیف نمی‌تواند بیشتر از ۱۰۰ باشد.',
  );

export const productFilterSchema = z
  .object({
    name: z.string().trim().max(200, 'نام محصول حداکثر ۲۰۰ نویسه است.'),
    tags: z.array(productTag).max(50, 'حداکثر ۵۰ تگ قابل انتخاب است.'),
    categoryId: z.string(),
    size: z.string(),
    color: z.string(),
    status: z.enum(['', 'DRAFT', 'ACTIVE', 'ARCHIVED']),
    availability: z.enum(['', 'IN_STOCK', 'OUT_OF_STOCK']),
    createdFrom: optionalIsoDateTime,
    createdTo: optionalIsoDateTime,
    minimumPriceRial: optionalPrice,
    maximumPriceRial: optionalPrice,
    maximumDiscountPercent: optionalDiscountPercent,
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
