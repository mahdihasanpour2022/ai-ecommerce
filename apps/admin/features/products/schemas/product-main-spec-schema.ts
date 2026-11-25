import { z } from 'zod';

export const MAX_MAIN_SPEC_TITLE_LENGTH = 20;
export const MAX_MAIN_SPEC_VALUE_LENGTH = 100;
export const MAX_MAIN_SPECS = 3;
export const MAX_PRODUCT_SPECS = 30;

const allowedMainSpecText = /^[\p{Script=Arabic}A-Za-z0-9\u06F0-\u06F9 _-]+$/u;

export function normalizeMainSpecText(value: string): string {
  return value.normalize('NFKC').trim().replace(/ +/gu, ' ');
}

function mainSpecText(label: string, maximum: number) {
  return z
    .string()
    .transform(normalizeMainSpecText)
    .pipe(
      z
        .string()
        .min(1, `${label} را وارد کنید.`)
        .max(maximum, `${label} نمی‌تواند بیشتر از ${maximum} کاراکتر باشد.`)
        .regex(allowedMainSpecText, `${label} فقط می‌تواند شامل حروف، عدد، فاصله، خط تیره و زیرخط باشد.`),
    );
}

export const productMainSpecSchema = z.object({
  key: mainSpecText('عنوان ویژگی', MAX_MAIN_SPEC_TITLE_LENGTH),
  value: mainSpecText('مقدار ویژگی', MAX_MAIN_SPEC_VALUE_LENGTH),
});

export const productMainSpecsSchema = z
  .array(productMainSpecSchema)
  .max(MAX_MAIN_SPECS, `حداکثر ${MAX_MAIN_SPECS} ویژگی اصلی می‌توانید تعریف کنید.`)
  .superRefine((items, context) => {
    const keys = new Set<string>();
    items.forEach((item, index) => {
      const comparisonKey = item.key.toLocaleLowerCase('en-US');
      if (keys.has(comparisonKey)) {
        context.addIssue({
          code: 'custom',
          path: [index, 'key'],
          message: 'این عنوان ویژگی قبلاً اضافه شده است.',
        });
      }
      keys.add(comparisonKey);
    });
  });

export const productSpecificationsSchema = z
  .array(productMainSpecSchema)
  .max(MAX_PRODUCT_SPECS, `حداکثر ${MAX_PRODUCT_SPECS} ویژگی می‌توانید تعریف کنید.`)
  .superRefine((items, context) => {
    const keys = new Set<string>();
    items.forEach((item, index) => {
      const comparisonKey = item.key.toLocaleLowerCase('en-US');
      if (keys.has(comparisonKey)) {
        context.addIssue({
          code: 'custom',
          path: [index, 'key'],
          message: 'این عنوان ویژگی قبلاً اضافه شده است.',
        });
      }
      keys.add(comparisonKey);
    });
  });

export type ProductMainSpec = z.output<typeof productMainSpecSchema>;
export type ProductMainSpecInput = z.input<typeof productMainSpecSchema>;
