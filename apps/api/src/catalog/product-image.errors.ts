import { HttpException } from '@nestjs/common';

export type ProductImageErrorCode =
  | 'PRODUCT_IMAGE_CONTENT_INVALID'
  | 'PRODUCT_IMAGE_DIMENSIONS_INVALID'
  | 'PRODUCT_IMAGE_LIMIT_REACHED'
  | 'PRODUCT_IMAGE_NOT_FOUND'
  | 'PRODUCT_IMAGE_ORDER_CONFLICT'
  | 'PRODUCT_IMAGE_STORAGE_UNAVAILABLE'
  | 'PRODUCT_IMAGE_TOO_LARGE'
  | 'PRODUCT_IMAGE_TYPE_UNSUPPORTED'
  | 'PRODUCT_LIFECYCLE_CONFLICT'
  | 'PRODUCT_MAIN_IMAGE_REQUIRED'
  | 'PRODUCT_NOT_FOUND'
  | 'VALIDATION_FAILED';

const MESSAGES: Readonly<Record<ProductImageErrorCode, string>> = {
  PRODUCT_IMAGE_CONTENT_INVALID: 'محتوای تصویر معتبر نیست.',
  PRODUCT_IMAGE_DIMENSIONS_INVALID: 'ابعاد تصویر معتبر نیست.',
  PRODUCT_IMAGE_LIMIT_REACHED: 'حداکثر تعداد تصویر محصول ثبت شده است.',
  PRODUCT_IMAGE_NOT_FOUND: 'تصویر محصول مورد نظر یافت نشد.',
  PRODUCT_IMAGE_ORDER_CONFLICT: 'ترتیب تصاویر تغییر کرده است؛ اطلاعات را دوباره دریافت کنید.',
  PRODUCT_IMAGE_STORAGE_UNAVAILABLE: 'ذخیره‌سازی تصویر در دسترس نیست.',
  PRODUCT_IMAGE_TOO_LARGE: 'حجم تصویر بیش از حد مجاز است.',
  PRODUCT_IMAGE_TYPE_UNSUPPORTED: 'نوع تصویر پشتیبانی نمی‌شود.',
  PRODUCT_LIFECYCLE_CONFLICT: 'عملیات با وضعیت فعلی محصول سازگار نیست.',
  PRODUCT_MAIN_IMAGE_REQUIRED: 'محصول فعال باید تصویر اصلی معتبر داشته باشد.',
  PRODUCT_NOT_FOUND: 'محصول مورد نظر یافت نشد.',
  VALIDATION_FAILED: 'اطلاعات درخواست معتبر نیست.',
};

const STATUS: Readonly<Record<ProductImageErrorCode, number>> = {
  PRODUCT_IMAGE_CONTENT_INVALID: 422,
  PRODUCT_IMAGE_DIMENSIONS_INVALID: 422,
  PRODUCT_IMAGE_LIMIT_REACHED: 409,
  PRODUCT_IMAGE_NOT_FOUND: 404,
  PRODUCT_IMAGE_ORDER_CONFLICT: 409,
  PRODUCT_IMAGE_STORAGE_UNAVAILABLE: 503,
  PRODUCT_IMAGE_TOO_LARGE: 413,
  PRODUCT_IMAGE_TYPE_UNSUPPORTED: 415,
  PRODUCT_LIFECYCLE_CONFLICT: 409,
  PRODUCT_MAIN_IMAGE_REQUIRED: 409,
  PRODUCT_NOT_FOUND: 404,
  VALIDATION_FAILED: 400,
};

export class ProductImageError extends Error {
  readonly statusCode: number;

  constructor(readonly code: ProductImageErrorCode) {
    super(MESSAGES[code]);
    this.name = 'ProductImageError';
    this.statusCode = STATUS[code];
  }
}

export function toProductImageHttpException(error: ProductImageError): HttpException {
  return new HttpException(
    {
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
      details: [],
    },
    error.statusCode,
  );
}
