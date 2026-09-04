import { HttpException } from '@nestjs/common';

export type InventoryErrorCode =
  | 'INVENTORY_VERSION_CONFLICT'
  | 'PRODUCT_LIFECYCLE_CONFLICT'
  | 'PRODUCT_VARIANT_NOT_FOUND'
  | 'VALIDATION_FAILED';

const MESSAGES: Readonly<Record<InventoryErrorCode, string>> = {
  INVENTORY_VERSION_CONFLICT: 'نسخه موجودی تغییر کرده است؛ اطلاعات را دوباره دریافت کنید.',
  PRODUCT_LIFECYCLE_CONFLICT: 'عملیات با وضعیت فعلی محصول سازگار نیست.',
  PRODUCT_VARIANT_NOT_FOUND: 'تنوع محصول مورد نظر یافت نشد.',
  VALIDATION_FAILED: 'اطلاعات درخواست معتبر نیست.',
};

const STATUS: Readonly<Record<InventoryErrorCode, number>> = {
  INVENTORY_VERSION_CONFLICT: 409,
  PRODUCT_LIFECYCLE_CONFLICT: 409,
  PRODUCT_VARIANT_NOT_FOUND: 404,
  VALIDATION_FAILED: 400,
};

export class InventoryError extends Error {
  readonly statusCode: number;

  constructor(readonly code: InventoryErrorCode) {
    super(MESSAGES[code]);
    this.name = 'InventoryError';
    this.statusCode = STATUS[code];
  }
}

export function toInventoryHttpException(error: InventoryError): HttpException {
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
