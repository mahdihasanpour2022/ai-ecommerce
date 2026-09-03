import { HttpException } from '@nestjs/common';

import { Prisma } from '../generated/prisma/client.js';

export type ProductErrorCode =
  | 'CATEGORY_NOT_FOUND'
  | 'PRODUCT_ACTIVATION_INCOMPLETE'
  | 'PRODUCT_LIFECYCLE_CONFLICT'
  | 'PRODUCT_NOT_FOUND'
  | 'PRODUCT_VARIANT_NOT_FOUND'
  | 'SKU_CONFLICT'
  | 'VALIDATION_FAILED'
  | 'VARIANT_COMBINATION_CONFLICT'
  | 'VARIANT_MODE_CONFLICT';

const MESSAGES: Readonly<Record<ProductErrorCode, string>> = {
  CATEGORY_NOT_FOUND: 'دسته‌بندی مورد نظر یافت نشد.',
  PRODUCT_ACTIVATION_INCOMPLETE: 'محصول شرایط لازم برای حالت فعال را ندارد.',
  PRODUCT_LIFECYCLE_CONFLICT: 'عملیات با وضعیت فعلی محصول سازگار نیست.',
  PRODUCT_NOT_FOUND: 'محصول مورد نظر یافت نشد.',
  PRODUCT_VARIANT_NOT_FOUND: 'تنوع محصول مورد نظر یافت نشد.',
  SKU_CONFLICT: 'کد کالای واردشده قبلاً استفاده شده است.',
  VALIDATION_FAILED: 'اطلاعات درخواست معتبر نیست.',
  VARIANT_COMBINATION_CONFLICT: 'ترکیب اندازه و رنگ قبلاً برای این محصول ثبت شده است.',
  VARIANT_MODE_CONFLICT: 'ترکیب تنوع‌های فعال محصول معتبر نیست.',
};

const STATUS: Readonly<Record<ProductErrorCode, number>> = {
  CATEGORY_NOT_FOUND: 404,
  PRODUCT_ACTIVATION_INCOMPLETE: 409,
  PRODUCT_LIFECYCLE_CONFLICT: 409,
  PRODUCT_NOT_FOUND: 404,
  PRODUCT_VARIANT_NOT_FOUND: 404,
  SKU_CONFLICT: 409,
  VALIDATION_FAILED: 400,
  VARIANT_COMBINATION_CONFLICT: 409,
  VARIANT_MODE_CONFLICT: 409,
};

export class ProductError extends Error {
  readonly statusCode: number;

  constructor(
    readonly code: ProductErrorCode,
    readonly details: readonly string[] = [],
  ) {
    super(MESSAGES[code]);
    this.name = 'ProductError';
    this.statusCode = STATUS[code];
  }
}

export function toProductHttpException(error: ProductError): HttpException {
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

export type ProductPersistenceOperation =
  'create-product' | 'create-variant' | 'update-product' | 'update-variant';

function databaseConstraint(error: Prisma.PrismaClientKnownRequestError): string | undefined {
  const databaseError = error.meta?.database_error;
  if (typeof databaseError !== 'object' || databaseError === null) return undefined;
  const value =
    'constraint' in databaseError
      ? (databaseError as { constraint?: unknown }).constraint
      : undefined;
  return typeof value === 'string' ? value : undefined;
}

function uniqueConstraint(error: Prisma.PrismaClientKnownRequestError): string | undefined {
  const target = error.meta?.target;
  if (typeof target === 'string') return target;
  if (Array.isArray(target)) return target.join(',');
  return databaseConstraint(error) ?? error.message;
}

export function mapProductPersistenceError(
  error: unknown,
  operation: ProductPersistenceOperation,
): ProductError | undefined {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return undefined;
  if (error.code === 'P2025') {
    return new ProductError(
      operation === 'update-variant' ? 'PRODUCT_VARIANT_NOT_FOUND' : 'PRODUCT_NOT_FOUND',
    );
  }
  if (error.code === 'P2003') {
    return new ProductError(
      operation === 'create-product' || operation === 'update-product'
        ? 'CATEGORY_NOT_FOUND'
        : 'PRODUCT_NOT_FOUND',
    );
  }
  if (error.code === 'P2002') {
    const constraint = uniqueConstraint(error);
    if (constraint?.includes('product_variants_sku_key') === true) {
      return new ProductError('SKU_CONFLICT');
    }
    if (constraint?.includes('product_variants_product_size_color_key') === true) {
      return new ProductError('VARIANT_COMBINATION_CONFLICT');
    }
  }
  if (error.code !== 'P2004') return undefined;
  const constraint = databaseConstraint(error) ?? error.message;
  if (constraint.includes('product_variants_active_mode_check')) {
    return new ProductError('VARIANT_MODE_CONFLICT');
  }
  if (
    constraint.includes('products_active_completeness_check') ||
    constraint.includes('products_variant_inventory_check')
  ) {
    return new ProductError('PRODUCT_ACTIVATION_INCOMPLETE');
  }
  if (
    constraint.includes('products_') ||
    constraint.includes('product_variants_') ||
    constraint.includes('inventories_')
  ) {
    return new ProductError('VALIDATION_FAILED');
  }
  return undefined;
}
