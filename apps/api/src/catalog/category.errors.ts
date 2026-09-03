import { HttpException } from '@nestjs/common';

import { Prisma } from '../generated/prisma/client.js';

export type CategoryErrorCode =
  | 'CATEGORY_LIMIT_REACHED'
  | 'CATEGORY_MOVE_INVALID'
  | 'CATEGORY_NAME_CONFLICT'
  | 'CATEGORY_NOT_EMPTY'
  | 'CATEGORY_NOT_FOUND'
  | 'VALIDATION_FAILED';

const MESSAGES: Readonly<Record<CategoryErrorCode, string>> = {
  CATEGORY_LIMIT_REACHED: 'حداکثر تعداد دسته‌بندی‌ها ثبت شده است.',
  CATEGORY_MOVE_INVALID: 'انتقال دسته‌بندی با ساختار مجاز سازگار نیست.',
  CATEGORY_NAME_CONFLICT: 'دسته‌بندی هم‌نامی در این سطح وجود دارد.',
  CATEGORY_NOT_EMPTY: 'دسته‌بندی دارای زیرمجموعه یا محصول است.',
  CATEGORY_NOT_FOUND: 'دسته‌بندی مورد نظر یافت نشد.',
  VALIDATION_FAILED: 'اطلاعات درخواست معتبر نیست.',
};

const STATUS: Readonly<Record<CategoryErrorCode, number>> = {
  CATEGORY_LIMIT_REACHED: 409,
  CATEGORY_MOVE_INVALID: 409,
  CATEGORY_NAME_CONFLICT: 409,
  CATEGORY_NOT_EMPTY: 409,
  CATEGORY_NOT_FOUND: 404,
  VALIDATION_FAILED: 400,
};

export class CategoryError extends Error {
  readonly statusCode: number;

  constructor(
    readonly code: CategoryErrorCode,
    readonly details: readonly string[] = [],
  ) {
    super(MESSAGES[code]);
    this.name = 'CategoryError';
    this.statusCode = STATUS[code];
  }
}

export function toCategoryHttpException(error: CategoryError): HttpException {
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

export type CategoryPersistenceOperation = 'create' | 'delete' | 'update';

export function mapCategoryPersistenceError(
  error: unknown,
  operation: CategoryPersistenceOperation,
): CategoryError | undefined {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return undefined;
  if (error.code === 'P2002') return new CategoryError('CATEGORY_NAME_CONFLICT');
  if (error.code === 'P2025') return new CategoryError('CATEGORY_NOT_FOUND');
  if (error.code === 'P2003') {
    return new CategoryError(operation === 'delete' ? 'CATEGORY_NOT_EMPTY' : 'CATEGORY_NOT_FOUND');
  }
  if (error.code !== 'P2004') return undefined;

  const databaseError = error.meta?.database_error;
  const constraint =
    typeof databaseError === 'object' && databaseError !== null && 'constraint' in databaseError
      ? (databaseError as { constraint?: unknown }).constraint
      : undefined;
  if (constraint === 'categories_limit_check') {
    return new CategoryError('CATEGORY_LIMIT_REACHED');
  }
  if (constraint === 'categories_tree_check') {
    return new CategoryError('CATEGORY_MOVE_INVALID');
  }
  return undefined;
}
