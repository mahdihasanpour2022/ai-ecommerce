import { HttpException } from '@nestjs/common';

export type BannerErrorCode = 'BANNER_IMAGE_REQUIRED' | 'BANNER_NOT_FOUND' | 'VALIDATION_FAILED';

const MESSAGES: Readonly<Record<BannerErrorCode, string>> = {
  BANNER_IMAGE_REQUIRED: 'انتخاب تصویر بنر الزامی است.',
  BANNER_NOT_FOUND: 'بنر مورد نظر یافت نشد.',
  VALIDATION_FAILED: 'اطلاعات درخواست معتبر نیست.',
};

const STATUS: Readonly<Record<BannerErrorCode, number>> = {
  BANNER_IMAGE_REQUIRED: 422,
  BANNER_NOT_FOUND: 404,
  VALIDATION_FAILED: 400,
};

export class BannerError extends Error {
  readonly statusCode: number;

  constructor(
    readonly code: BannerErrorCode,
    readonly details: readonly string[] = [],
  ) {
    super(MESSAGES[code]);
    this.name = 'BannerError';
    this.statusCode = STATUS[code];
  }
}

// خطای دامنه بنر را به قرارداد یکنواخت HTTP تبدیل می‌کند.
export function toBannerHttpException(error: BannerError): HttpException {
  return new HttpException(
    {
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
      details: [...error.details],
    },
    error.statusCode,
  );
}
