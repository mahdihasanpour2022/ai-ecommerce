import { HttpException } from '@nestjs/common';

export type PriceDisplaySettingErrorCode = 'VALIDATION_FAILED';

const VALIDATION_MESSAGE = 'اطلاعات درخواست معتبر نیست.';

export class PriceDisplaySettingError extends Error {
  readonly statusCode = 400;

  constructor(readonly code: PriceDisplaySettingErrorCode) {
    super(VALIDATION_MESSAGE);
    this.name = 'PriceDisplaySettingError';
  }
}

export function toPriceDisplaySettingHttpException(error: PriceDisplaySettingError): HttpException {
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
