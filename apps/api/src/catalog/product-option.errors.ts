import { HttpException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';

export type ProductOptionErrorCode =
  | 'PRODUCT_COLOR_CONFLICT'
  | 'PRODUCT_COLOR_NOT_FOUND'
  | 'PRODUCT_SIZE_CONFLICT'
  | 'PRODUCT_SIZE_NOT_FOUND'
  | 'PRODUCT_SIZE_VALIDATION_FAILED'
  | 'VALIDATION_FAILED';

const STATUS: Readonly<Record<ProductOptionErrorCode, number>> = {
  PRODUCT_COLOR_CONFLICT: 409,
  PRODUCT_COLOR_NOT_FOUND: 404,
  PRODUCT_SIZE_CONFLICT: 409,
  PRODUCT_SIZE_NOT_FOUND: 404,
  PRODUCT_SIZE_VALIDATION_FAILED: 400,
  VALIDATION_FAILED: 400,
};

const MESSAGE: Readonly<Record<ProductOptionErrorCode, string>> = {
  PRODUCT_COLOR_CONFLICT: 'نام فارسی یا انگلیسی رنگ قبلاً ثبت شده است.',
  PRODUCT_COLOR_NOT_FOUND: 'رنگ موردنظر یافت نشد.',
  PRODUCT_SIZE_CONFLICT: 'نام فارسی یا انگلیسی سایز قبلاً ثبت شده است.',
  PRODUCT_SIZE_NOT_FOUND: 'سایز موردنظر یافت نشد.',
  PRODUCT_SIZE_VALIDATION_FAILED: 'اطلاعات سایز معتبر نیست.',
  VALIDATION_FAILED: 'اطلاعات رنگ معتبر نیست.',
};

export class ProductOptionError extends Error {
  constructor(readonly code: ProductOptionErrorCode) {
    super(MESSAGE[code]);
    this.name = 'ProductOptionError';
  }
}

export function toProductOptionHttpException(error: ProductOptionError): HttpException {
  return new HttpException({ code: error.code, message: error.message }, STATUS[error.code]);
}

export function mapProductOptionPersistenceError(error: unknown): ProductOptionError | undefined {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return undefined;
  if (error.code === 'P2002') return new ProductOptionError('PRODUCT_COLOR_CONFLICT');
  if (error.code === 'P2025') return new ProductOptionError('PRODUCT_COLOR_NOT_FOUND');
  return undefined;
}

export function mapProductSizeOptionPersistenceError(error: unknown): ProductOptionError | undefined {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return undefined;
  if (error.code === 'P2002') return new ProductOptionError('PRODUCT_SIZE_CONFLICT');
  if (error.code === 'P2025') return new ProductOptionError('PRODUCT_SIZE_NOT_FOUND');
  return undefined;
}
