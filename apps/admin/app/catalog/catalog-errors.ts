import { AdminHttpError } from '../http/http-client';

export type CatalogFailureKind =
  'canceled' | 'connectivity' | 'forbidden' | 'not-found' | 'validation' | 'conflict' | 'server';

export interface CatalogFailure {
  readonly kind: CatalogFailureKind;
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
}

const MESSAGES = {
  canceled: '',
  connectivity: 'ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.',
  forbidden: 'شما مجوز لازم برای مشاهده این بخش را ندارید.',
  notFound: 'اطلاعات درخواستی یافت نشد.',
  validation: 'درخواست معتبر نیست. صفحه را تازه‌سازی و دوباره تلاش کنید.',
  conflict: 'اطلاعات تغییر کرده است. داده‌های تازه را دریافت و دوباره بررسی کنید.',
  server: 'خطایی در سرور رخ داد. لطفاً دوباره تلاش کنید.',
} as const;

const CONFLICT_CODES = new Set([
  'CATEGORY_LIMIT_REACHED',
  'CATEGORY_MOVE_INVALID',
  'CATEGORY_NAME_CONFLICT',
  'CATEGORY_NOT_EMPTY',
  'PRODUCT_ACTIVATION_INCOMPLETE',
  'PRODUCT_LIFECYCLE_CONFLICT',
  'SKU_CONFLICT',
  'VARIANT_COMBINATION_CONFLICT',
  'VARIANT_MODE_CONFLICT',
]);

export function classifyCatalogFailure(error: unknown): CatalogFailure {
  if (!(error instanceof AdminHttpError)) {
    return {
      kind: 'server',
      code: 'UNEXPECTED_CLIENT_ERROR',
      message: MESSAGES.server,
      retryable: true,
    };
  }
  if (error.kind === 'canceled') {
    return { kind: 'canceled', code: error.code, message: MESSAGES.canceled, retryable: false };
  }
  if (error.kind === 'network' || error.kind === 'timeout') {
    return {
      kind: 'connectivity',
      code: error.code,
      message: MESSAGES.connectivity,
      retryable: true,
    };
  }
  if (error.status === 403 || error.code === 'INSUFFICIENT_PERMISSION') {
    return { kind: 'forbidden', code: error.code, message: MESSAGES.forbidden, retryable: false };
  }
  if (error.status === 404 || error.code.endsWith('_NOT_FOUND')) {
    return { kind: 'not-found', code: error.code, message: MESSAGES.notFound, retryable: false };
  }
  if (error.status === 400 || error.code === 'VALIDATION_FAILED') {
    return { kind: 'validation', code: error.code, message: MESSAGES.validation, retryable: false };
  }
  if (error.status === 409 || CONFLICT_CODES.has(error.code)) {
    return { kind: 'conflict', code: error.code, message: MESSAGES.conflict, retryable: true };
  }
  return { kind: 'server', code: error.code, message: MESSAGES.server, retryable: true };
}
