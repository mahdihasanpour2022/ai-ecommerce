import { HttpException } from '@nestjs/common';

const FAVORITE_ERROR = {
  PRODUCT_NOT_FOUND: { statusCode: 404, message: 'محصول مورد نظر یافت نشد.' },
  VALIDATION_FAILED: { statusCode: 400, message: 'اطلاعات درخواست معتبر نیست.' },
} as const;

export type FavoriteErrorCode = keyof typeof FAVORITE_ERROR;

export class FavoriteError extends Error {
  readonly statusCode: number;

  constructor(
    readonly code: FavoriteErrorCode,
    readonly details: readonly string[] = [],
  ) {
    const definition = FAVORITE_ERROR[code];
    super(definition.message);
    this.name = 'FavoriteError';
    this.statusCode = definition.statusCode;
  }
}

// خطاهای دامنه Favorite را بدون جزئیات داخلی به envelope پایدار HTTP تبدیل می‌کند.
export function toFavoriteHttpException(error: FavoriteError): HttpException {
  return new HttpException(
    {
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
      details: error.details,
    },
    error.statusCode,
  );
}
