import { z } from 'zod';

const asciiInteger = /^\d+$/u;
const maximumInventory = 2_147_483_647;

function isFileLike(value: unknown): value is File {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    typeof value.name === 'string' &&
    'size' in value &&
    typeof value.size === 'number' &&
    'type' in value &&
    typeof value.type === 'string' &&
    'arrayBuffer' in value &&
    typeof value.arrayBuffer === 'function'
  );
}

const optionalSingleLine = (label: string) =>
  z
    .string()
    .trim()
    .max(80, `${label} نمی‌تواند بیشتر از ۸۰ کاراکتر باشد.`)
    .refine((value) => !/[\n\r<>]/u.test(value), `${label} معتبر نیست.`);

export const editProductSchema = z.object({
  image: z.custom<File>(isFileLike, { message: 'فایل تصویر معتبر نیست.' }).optional(),
  name: z
    .string()
    .trim()
    .min(1, 'نام محصول را وارد کنید.')
    .max(200, 'نام محصول نمی‌تواند بیشتر از ۲۰۰ کاراکتر باشد.')
    .refine((value) => !/[\n\r<>]/u.test(value), 'نام محصول معتبر نیست.'),
  description: z
    .string()
    .trim()
    .max(200, 'توضیحات نمی‌تواند بیشتر از ۲۰۰ کاراکتر باشد.')
    .refine((value) => !/[<>]/u.test(value), 'توضیحات معتبر نیست.'),
  categoryId: z.uuid('یک دسته‌بندی معتبر انتخاب کنید.'),
  variantId: z.uuid('یک تنوع معتبر انتخاب کنید.'),
  size: optionalSingleLine('سایز'),
  color: optionalSingleLine('رنگ'),
  priceRial: z
    .string()
    .trim()
    .regex(asciiInteger, 'قیمت را وارد کنید.')
    .refine((value) => {
      const price = Number(value);
      return Number.isSafeInteger(price) && price >= 10 && price % 10 === 0;
    }, 'قیمت باید عددی مثبت و مضرب ۱۰ ریال باشد.'),
  onHandQuantity: z
    .string()
    .trim()
    .regex(asciiInteger, 'موجودی را وارد کنید.')
    .refine((value) => {
      const quantity = Number(value);
      return Number.isInteger(quantity) && quantity >= 0 && quantity <= maximumInventory;
    }, 'موجودی باید عددی بین صفر و حداکثر مجاز باشد.'),
});

export type EditProductFormValues = z.infer<typeof editProductSchema>;
