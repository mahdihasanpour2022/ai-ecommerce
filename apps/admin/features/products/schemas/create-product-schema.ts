import { z } from 'zod';

const asciiInteger = /^\d+$/u;
const maximumInventory = 2_147_483_647;
const productTag = /^[a-z]+(?:_[a-z]+)*$/u;

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

export const createProductSchema = z.object({
  image: z.custom<File>(isFileLike, { message: 'تصویر محصول را انتخاب کنید.' }),
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
  tag: z
    .string()
    .trim()
    .toLowerCase()
    .max(80, 'تگ نمی‌تواند بیشتر از ۸۰ کاراکتر باشد.')
    .refine(
      (value) => value === '' || productTag.test(value),
      'تگ فقط باید شامل حروف انگلیسی کوچک باشد و کلمات با _ جدا شوند.',
    ),
  categoryId: z.uuid('یک دسته‌بندی انتخاب کنید.'),
  size: optionalSingleLine('سایز').min(1, 'یک سایز انتخاب کنید.'),
  color: optionalSingleLine('رنگ').min(1, 'یک رنگ انتخاب کنید.'),
  originalPriceRial: z
    .string()
    .trim()
    .regex(asciiInteger, 'قیمت را وارد کنید.')
    .refine((value) => {
      const price = Number(value);
      return Number.isSafeInteger(price) && price >= 10 && price % 10 === 0;
    }, 'قیمت باید عددی مثبت و مضرب ۱۰ ریال باشد.'),
  discountPercent: z
    .string()
    .trim()
    .regex(asciiInteger, 'درصد تخفیف را وارد کنید.')
    .refine((value) => {
      const discount = Number(value);
      return Number.isInteger(discount) && discount >= 0 && discount <= 100;
    }, 'درصد تخفیف باید عددی بین صفر تا صد باشد.'),
  onHandQuantity: z
    .string()
    .trim()
    .regex(asciiInteger, 'موجودی را وارد کنید.')
    .refine((value) => {
      const quantity = Number(value);
      return Number.isInteger(quantity) && quantity >= 1 && quantity <= maximumInventory;
    }, 'موجودی اولیه باید حداقل ۱ باشد.'),
});

export type CreateProductFormValues = z.infer<typeof createProductSchema>;
