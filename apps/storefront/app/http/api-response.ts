export interface ApiResponse<Result = null, SingleResult = null, Details = null> {
  readonly statusCode: number;
  readonly hasError: boolean;
  readonly message: string;
  readonly code: string;
  readonly count: number;
  readonly result: Result;
  readonly singleResult: SingleResult;
  readonly details: Details;
}

export interface PaginatedApiResponse<Result = readonly unknown[]>
  extends ApiResponse<Result, null, null> {
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
}

const RESPONSE_KEYS = [
  'statusCode',
  'hasError',
  'message',
  'code',
  'count',
  'result',
  'singleResult',
  'details',
] as const;

const PAGINATION_KEYS = ['page', 'pageSize', 'totalItems', 'totalPages'] as const;

// پاسخ ناشناخته را پیش از استفاده در مسیر خطا با قرارداد عمومی API تطبیق می‌دهد.
export function parseApiResponse(value: unknown): ApiResponse<unknown, unknown, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (
    ![RESPONSE_KEYS.length, RESPONSE_KEYS.length + PAGINATION_KEYS.length].includes(
      Object.keys(record).length,
    ) ||
    RESPONSE_KEYS.some((key) => !(key in record)) ||
    Object.keys(record).some(
      (key) =>
        !RESPONSE_KEYS.includes(key as (typeof RESPONSE_KEYS)[number]) &&
        !PAGINATION_KEYS.includes(key as (typeof PAGINATION_KEYS)[number]),
    ) ||
    !Number.isInteger(record.statusCode) ||
    (record.statusCode as number) < 100 ||
    (record.statusCode as number) > 599 ||
    typeof record.hasError !== 'boolean' ||
    typeof record.message !== 'string' ||
    record.message.trim().length === 0 ||
    record.message.length > 500 ||
    typeof record.code !== 'string' ||
    !/^[A-Z][A-Z0-9_]{0,127}$/u.test(record.code) ||
    !Number.isSafeInteger(record.count) ||
    (record.count as number) < 0
  ) {
    return null;
  }
  const hasPagination = PAGINATION_KEYS.some((key) => key in record);
  if (
    hasPagination &&
    (PAGINATION_KEYS.some((key) => !(key in record)) ||
      !Number.isSafeInteger(record.page) ||
      (record.page as number) < 1 ||
      !Number.isSafeInteger(record.pageSize) ||
      (record.pageSize as number) < 1 ||
      !Number.isSafeInteger(record.totalItems) ||
      (record.totalItems as number) < 0 ||
      !Number.isSafeInteger(record.totalPages) ||
      (record.totalPages as number) < 0 ||
      !Array.isArray(record.result) ||
      record.singleResult !== null)
  ) {
    return null;
  }
  return record as unknown as ApiResponse<unknown, unknown, unknown>;
}

// فقط envelope خطای معتبر و هم‌خوان با status HTTP را برمی‌گرداند.
export function errorResponse(
  value: unknown,
  statusCode: number,
): ApiResponse<null, null, unknown> | null {
  const response = parseApiResponse(value);
  return response &&
    response.hasError &&
    response.statusCode === statusCode &&
    response.count === 0 &&
    response.result === null &&
    response.singleResult === null
    ? (response as ApiResponse<null, null, unknown>)
    : null;
}
