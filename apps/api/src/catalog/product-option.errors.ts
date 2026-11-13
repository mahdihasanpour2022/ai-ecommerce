import { NotFoundException } from '@nestjs/common';

export type ProductOptionErrorCode = 'PRODUCT_COLOR_NOT_FOUND';

export class ProductOptionError extends Error {
  constructor(readonly code: ProductOptionErrorCode) {
    super(code);
  }
}

export function toProductOptionHttpException(error: ProductOptionError): NotFoundException {
  return new NotFoundException({
    code: error.code,
    message: 'رنگ موردنظر یافت نشد.',
  });
}
