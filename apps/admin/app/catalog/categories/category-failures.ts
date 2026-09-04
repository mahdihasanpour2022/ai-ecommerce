import { classifyCatalogFailure } from '../catalog-errors';

const CATEGORY_MESSAGES: Readonly<Record<string, string>> = {
  CATEGORY_NAME_CONFLICT: 'در این سطح، دسته‌بندی دیگری با همین نام وجود دارد.',
  CATEGORY_MOVE_INVALID:
    'انتقال به این والد مجاز نیست. ساختار دسته‌بندی تازه شده را بررسی و دوباره تلاش کنید.',
  CATEGORY_LIMIT_REACHED: 'حداکثر تعداد دسته‌بندی‌ها ثبت شده است و امکان افزودن وجود ندارد.',
  CATEGORY_NOT_EMPTY: 'این دسته‌بندی دارای زیرمجموعه یا محصول است و حذف نمی‌شود.',
  CATEGORY_NOT_FOUND: 'دسته‌بندی یا والد انتخاب‌شده دیگر وجود ندارد. فهرست را تازه کنید.',
  VALIDATION_FAILED: 'اطلاعات واردشده معتبر نیست. فیلدها را بررسی کنید.',
  CSRF_VALIDATION_FAILED: 'نشست ایمن شما تغییر کرده است. صفحه را تازه‌سازی و دوباره تلاش کنید.',
  INSUFFICIENT_PERMISSION: 'مجوز مدیریت دسته‌بندی برای حساب شما وجود ندارد.',
};

export interface CategoryFailurePresentation {
  readonly code: string;
  readonly message: string;
  readonly field?: 'name' | 'parentId';
}

export function categoryFailurePresentation(error: unknown): CategoryFailurePresentation {
  const failure = classifyCatalogFailure(error);
  return {
    code: failure.code,
    message: CATEGORY_MESSAGES[failure.code] ?? failure.message,
    ...(failure.code === 'CATEGORY_NAME_CONFLICT'
      ? { field: 'name' as const }
      : failure.code === 'CATEGORY_MOVE_INVALID'
        ? { field: 'parentId' as const }
        : {}),
  };
}
