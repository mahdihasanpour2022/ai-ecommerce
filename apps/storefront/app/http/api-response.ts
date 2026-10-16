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

// پاسخ ناشناخته را پیش از استفاده در مسیر خطا با قرارداد عمومی API تطبیق می‌دهد.
export function parseApiResponse(value: unknown): ApiResponse<unknown, unknown, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (
    Object.keys(record).length !== RESPONSE_KEYS.length ||
    RESPONSE_KEYS.some((key) => !(key in record)) ||
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
