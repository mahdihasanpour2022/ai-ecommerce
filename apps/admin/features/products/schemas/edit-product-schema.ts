import { z } from 'zod';
import {
  MAX_PRODUCT_SPECS,
  productMainSpecsSchema,
  productSpecificationsSchema,
} from './product-main-spec-schema';

const asciiInteger = /^\d+$/u;
const productTag = /^[a-z]+(?:_[a-z]+)*$/u;

export const editProductSchema = z
  .object({
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
    categoryId: z.uuid('یک دسته‌بندی معتبر انتخاب کنید.'),
    mainSpecs: productMainSpecsSchema,
    specifications: productSpecificationsSchema,
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
  })
  .superRefine((values, context) => {
    if (values.mainSpecs.length + values.specifications.length > MAX_PRODUCT_SPECS) {
      context.addIssue({
        code: 'custom',
        path: ['specifications'],
        message: `مجموع ویژگی‌های اصلی و فرعی نمی‌تواند بیشتر از ${MAX_PRODUCT_SPECS} مورد باشد.`,
      });
    }

    const mainKeys = new Set(values.mainSpecs.map(({ key }) => key.toLocaleLowerCase('en-US')));
    values.specifications.forEach(({ key }, index) => {
      if (mainKeys.has(key.toLocaleLowerCase('en-US'))) {
        context.addIssue({
          code: 'custom',
          path: ['specifications', index, 'key'],
          message: 'این عنوان ویژگی قبلاً در ویژگی‌های اصلی اضافه شده است.',
        });
      }
    });
  });

export type EditProductFormValues = z.infer<typeof editProductSchema>;
