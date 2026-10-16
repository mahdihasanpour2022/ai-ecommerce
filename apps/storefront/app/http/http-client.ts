import axios from 'axios';
import type { AxiosAdapter, AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { errorResponse } from './api-response';
import type { ApiResponse } from './api-response';

export const DEFAULT_HTTP_TIMEOUT_MS = 20_000;
const DEFAULT_API_BASE_URL = '/api/v1';

export type HttpFailureKind = 'canceled' | 'configuration' | 'http' | 'network' | 'timeout';

function fallbackFailureMessage(kind: HttpFailureKind): string {
  if (kind === 'network' || kind === 'timeout') {
    return 'ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.';
  }
  if (kind === 'canceled') return 'درخواست لغو شد.';
  return 'انجام درخواست ممکن نشد. لطفاً دوباره تلاش کنید.';
}

export class StorefrontHttpError extends Error {
  constructor(
    readonly kind: HttpFailureKind,
    readonly status: number | null,
    readonly code: string,
    readonly retryAfter: string | null = null,
    readonly details: readonly string[] = [],
    message: string | null = null,
  ) {
    super(message ?? fallbackFailureMessage(kind));
    this.name = 'StorefrontHttpError';
  }
}

class RequestPolicyError extends Error {
  constructor(readonly policyCode: string) {
    super(`Storefront HTTP request policy rejected the request: ${policyCode}.`);
    this.name = 'RequestPolicyError';
  }
}

// base URL کلاینت را به مسیر داخلی BFF محدود می‌کند تا مقصد خارجی قابل تزریق نباشد.
export function getApiBaseUrl(value?: string): string {
  const candidate = value?.trim() || DEFAULT_API_BASE_URL;
  if (
    !candidate.startsWith('/') ||
    !/^\/[A-Za-z0-9/_-]*$/u.test(candidate) ||
    candidate.startsWith('//')
  ) {
    throw new Error('The Storefront API base must be a safe application-relative BFF path.');
  }
  return candidate.replace(/\/$/u, '');
}

function parsedErrorResponse(error: AxiosError): ApiResponse<null, null, unknown> | null {
  const status = error.response?.status;
  return status === undefined ? null : errorResponse(error.response?.data, status);
}

function responseDetails(details: unknown): readonly string[] {
  if (!Array.isArray(details)) return [];
  return details
    .slice(0, 20)
    .filter(
      (detail): detail is string =>
        typeof detail === 'string' && /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/u.test(detail),
    );
}

// همه خطاهای Axios و خطاهای قرارداد را به خطای امن و یکنواخت Storefront تبدیل می‌کند.
export function normalizeHttpFailure(error: unknown): StorefrontHttpError {
  if (error instanceof StorefrontHttpError) return error;
  if (error instanceof RequestPolicyError) {
    return new StorefrontHttpError('configuration', null, error.policyCode);
  }
  if (axios.isCancel(error)) {
    return new StorefrontHttpError('canceled', null, 'REQUEST_CANCELED');
  }
  if (!axios.isAxiosError(error)) {
    return new StorefrontHttpError('configuration', null, 'UNEXPECTED_CLIENT_ERROR');
  }
  if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
    return new StorefrontHttpError('timeout', null, 'REQUEST_TIMEOUT');
  }
  if (error.response) {
    const response = parsedErrorResponse(error);
    if (!response) return new StorefrontHttpError('http', 502, 'INVALID_RESPONSE');
    return new StorefrontHttpError(
      'http',
      error.response.status,
      response.code,
      error.response.headers['retry-after']?.toString() ?? null,
      responseDetails(response.details),
      response.message,
    );
  }
  return new StorefrontHttpError('network', null, 'NETWORK_ERROR');
}

export interface CreateHttpClientOptions {
  readonly baseURL?: string;
  readonly adapter?: AxiosAdapter;
}

// کلاینت فقط از BFF هم‌مبدأ استفاده می‌کند و مانع ارسال توکن ساختگی از JavaScript می‌شود.
export function createHttpClient(options: CreateHttpClientOptions = {}): AxiosInstance {
  const config: AxiosRequestConfig = {
    allowAbsoluteUrls: false,
    baseURL: options.baseURL ?? getApiBaseUrl(),
    timeout: DEFAULT_HTTP_TIMEOUT_MS,
    headers: { Accept: 'application/json' },
    transitional: { clarifyTimeoutError: true },
    ...(options.adapter ? { adapter: options.adapter } : {}),
  };
  const client = axios.create(config);
  client.interceptors.request.use((request) => {
    request.allowAbsoluteUrls = false;
    if (request.headers.has('Authorization')) {
      throw new RequestPolicyError('AUTHORIZATION_HEADER_FORBIDDEN');
    }
    return request;
  });
  client.interceptors.response.use(
    (response) => response,
    (error: unknown) => Promise.reject(normalizeHttpFailure(error)),
  );
  return client;
}

export const httpClient = createHttpClient();
