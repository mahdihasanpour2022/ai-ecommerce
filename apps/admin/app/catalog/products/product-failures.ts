import { AdminHttpError } from '../../http/http-client';
import { classifyCatalogFailure } from '../catalog-errors';

export type ProductFailureField =
  'name' | 'description' | 'categoryId' | 'sku' | 'size' | 'color' | 'price' | 'quantity';

export interface ProductFailurePresentation {
  readonly code: string;
  readonly message: string;
  readonly field?: ProductFailureField;
}

const DETAIL_FIELDS: Readonly<Record<string, ProductFailureField>> = {
  name: 'name',
  description: 'description',
  categoryId: 'categoryId',
  sku: 'sku',
  size: 'size',
  color: 'color',
  priceRial: 'price',
  onHandQuantity: 'quantity',
};

const CODE_MESSAGES: Readonly<Record<string, string>> = {
  SKU_CONFLICT: 'این کد کالا قبلاً استفاده شده است. کد دیگری وارد کنید.',
  VARIANT_COMBINATION_CONFLICT: 'ترکیب اندازه و رنگ تکراری است. تنوع‌ها را بررسی کنید.',
  VARIANT_MODE_CONFLICT: 'تنوع‌ها با حالت انتخاب‌شده سازگار نیستند.',
  CATEGORY_NOT_FOUND: 'دسته‌بندی انتخاب‌شده دیگر موجود نیست. دسته‌بندی‌ها را تازه‌سازی کنید.',
  INSUFFICIENT_PERMISSION: 'مجوز ایجاد محصول برای این حساب موجود نیست.',
  CSRF_VALIDATION_FAILED: 'اعتبار امنیتی درخواست منقضی شده است. صفحه را تازه‌سازی کنید.',
};

export function productFailurePresentation(error: unknown): ProductFailurePresentation {
  const failure = classifyCatalogFailure(error);
  const detail = error instanceof AdminHttpError ? error.details[0] : undefined;
  const field = detail === undefined ? undefined : DETAIL_FIELDS[detail];
  return {
    code: failure.code,
    message:
      CODE_MESSAGES[failure.code] ??
      (failure.kind === 'validation'
        ? 'اطلاعات فرم معتبر نیست. فیلدهای مشخص‌شده را بررسی کنید.'
        : failure.message),
    ...(field === undefined ? {} : { field }),
  };
}
