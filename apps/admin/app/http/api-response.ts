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

const KEYS = [
  'statusCode',
  'hasError',
  'message',
  'code',
  'count',
  'result',
  'singleResult',
  'details',
] as const;

export function parseApiResponse(value: unknown): ApiResponse<unknown, unknown, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (
    Object.keys(record).length !== KEYS.length ||
    KEYS.some((key) => !(key in record)) ||
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

export interface ApiOperationResult<Data> {
  readonly data: Data;
  readonly message: string;
  readonly code: string;
}

export class ApiResponseContractError extends Error {
  constructor() {
    super('The API response does not match the canonical response contract.');
    this.name = 'ApiResponseContractError';
  }
}

export function successOperationSingle(
  value: unknown,
  statusCode: number,
): ApiOperationResult<unknown> | null {
  const response = parseApiResponse(value);
  return response &&
    !response.hasError &&
    response.statusCode === statusCode &&
    response.result === null &&
    response.singleResult !== null &&
    response.details === null
    ? { data: response.singleResult, message: response.message, code: response.code }
    : null;
}

export function successOperationWithoutPayload(
  value: unknown,
  statusCode: number,
): ApiOperationResult<null> | null {
  const response = parseApiResponse(value);
  return response &&
    !response.hasError &&
    response.statusCode === statusCode &&
    response.count === 0 &&
    response.result === null &&
    response.singleResult === null &&
    response.details === null
    ? { data: null, message: response.message, code: response.code }
    : null;
}

export function successSingle(value: unknown, statusCode: number): unknown | null {
  const response = parseApiResponse(value);
  return response &&
    !response.hasError &&
    response.statusCode === statusCode &&
    response.result === null &&
    response.singleResult !== null &&
    response.details === null
    ? response.singleResult
    : null;
}

export function successCollection(value: unknown, statusCode: number): unknown[] | null {
  const response = parseApiResponse(value);
  return response &&
    !response.hasError &&
    response.statusCode === statusCode &&
    Array.isArray(response.result) &&
    response.singleResult === null &&
    response.count === response.result.length &&
    response.details === null
    ? response.result
    : null;
}

export function isNoPayloadSuccess(value: unknown, statusCode: number): boolean {
  return successOperationWithoutPayload(value, statusCode) !== null;
}

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
