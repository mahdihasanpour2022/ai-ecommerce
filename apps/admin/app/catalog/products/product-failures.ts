import { AdminHttpError } from '../../http/http-client';
import { classifyCatalogFailure } from '../catalog-errors';

export type ProductFailureField =
  'name' | 'description' | 'categoryId' | 'sku' | 'size' | 'color' | 'price' | 'quantity';

export interface ProductFailurePresentation {
  readonly code: string;
  readonly message: string;
  readonly refreshProduct: boolean;
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
  PRODUCT_NOT_FOUND: 'محصول مورد نظر دیگر موجود نیست.',
  PRODUCT_VARIANT_NOT_FOUND: 'تنوع مورد نظر دیگر موجود نیست. اطلاعات محصول را تازه‌سازی کنید.',
  PRODUCT_LIFECYCLE_CONFLICT: 'وضعیت محصول تغییر کرده است. اطلاعات تازه را دریافت کنید.',
  INSUFFICIENT_PERMISSION: 'مجوز ایجاد محصول برای این حساب موجود نیست.',
  CSRF_VALIDATION_FAILED: 'اعتبار امنیتی درخواست منقضی شده است. صفحه را تازه‌سازی کنید.',
};

export function productFailurePresentation(error: unknown): ProductFailurePresentation {
  const failure = classifyCatalogFailure(error);
  const detail = error instanceof AdminHttpError ? error.details[0] : undefined;
  const field = detail === undefined ? undefined : DETAIL_FIELDS[detail];
  const refreshProduct = new Set([
    'CATEGORY_NOT_FOUND',
    'PRODUCT_NOT_FOUND',
    'PRODUCT_VARIANT_NOT_FOUND',
    'PRODUCT_LIFECYCLE_CONFLICT',
    'VARIANT_COMBINATION_CONFLICT',
    'VARIANT_MODE_CONFLICT',
  ]).has(failure.code);
  return {
    code: failure.code,
    message:
      CODE_MESSAGES[failure.code] ??
      (failure.kind === 'validation'
        ? 'اطلاعات فرم معتبر نیست. فیلدهای مشخص‌شده را بررسی کنید.'
        : failure.message),
    refreshProduct,
    ...(field === undefined ? {} : { field }),
  };
}
