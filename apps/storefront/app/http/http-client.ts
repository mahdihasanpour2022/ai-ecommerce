import axios from 'axios';
import type {
  AxiosAdapter,
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { errorResponse } from './api-response';
import type { ApiResponse } from './api-response';

export const DEFAULT_HTTP_TIMEOUT_MS = 20_000;
const DEFAULT_API_BASE_URL = '/api/v1';
const CUSTOMER_REFRESH_PATH = '/customer-auth/refresh';
const CUSTOMER_CSRF_COOKIE_NAME = 'storefront_customer_csrf';
const REFRESHABLE_AUTH_CODES = new Set(['ACCESS_TOKEN_EXPIRED', 'AUTHENTICATION_REQUIRED']);
const TERMINAL_AUTH_CODES = new Set([
  'AUTHENTICATION_REQUIRED',
  'INVALID_ACCESS_TOKEN',
  'REFRESH_TOKEN_INVALID',
  'REFRESH_TOKEN_EXPIRED',
  'REFRESH_TOKEN_REUSED',
  'CUSTOMER_ACCOUNT_DISABLED',
]);
const terminalAuthenticationListeners = new Set<() => void>();

export interface CustomerAuthRequestPolicy {
  readonly csrf?: boolean;
  readonly refreshEligible?: boolean;
  readonly replayed?: boolean;
}

declare module 'axios' {
  interface AxiosRequestConfig {
    customerAuth?: CustomerAuthRequestPolicy;
  }

  interface InternalAxiosRequestConfig {
    customerAuth?: CustomerAuthRequestPolicy;
  }
}

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

// مقدار CSRF فقط از کوکی خوانای اختصاصی مشتری خوانده می‌شود.
function customerCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const prefix = `${CUSTOMER_CSRF_COOKIE_NAME}=`;
  const cookie = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  if (!cookie) return null;
  try {
    return decodeURIComponent(cookie.slice(prefix.length));
  } catch {
    return null;
  }
}

function notifyTerminalAuthenticationLoss(): void {
  for (const listener of terminalAuthenticationListeners) listener();
}

// پایان قطعی نشست را بدون وابسته‌کردن لایه HTTP به React منتشر می‌کند.
export function onTerminalCustomerAuthenticationLoss(listener: () => void): () => void {
  terminalAuthenticationListeners.add(listener);
  return () => terminalAuthenticationListeners.delete(listener);
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
  let refreshPromise: Promise<void> | null = null;
  client.interceptors.request.use((request) => {
    request.allowAbsoluteUrls = false;
    if (request.headers.has('Authorization')) {
      throw new RequestPolicyError('AUTHORIZATION_HEADER_FORBIDDEN');
    }
    if (request.customerAuth?.csrf) {
      const csrfToken = customerCsrfToken();
      if (!csrfToken) throw new RequestPolicyError('CUSTOMER_CSRF_MISSING');
      request.headers.set('X-CSRF-Token', csrfToken);
    }
    return request;
  });
  client.interceptors.response.use(
    (response) => response,
    async (error: unknown): Promise<AxiosResponse> => {
      if (axios.isAxiosError(error) && error.response && error.config) {
        const response = parsedErrorResponse(error);
        const policy = error.config.customerAuth;
        // فقط درخواست علامت‌خورده را پس از یک Refresh مشترک حداکثر یک بار تکرار می‌کند.
        if (
          policy?.refreshEligible &&
          !policy.replayed &&
          error.response.status === 401 &&
          response &&
          REFRESHABLE_AUTH_CODES.has(response.code)
        ) {
          try {
            refreshPromise ??= client
              .post(CUSTOMER_REFRESH_PATH, undefined, {
                customerAuth: { csrf: true },
              })
              .then(() => undefined)
              .finally(() => {
                refreshPromise = null;
              });
            await refreshPromise;
            const replayConfig: InternalAxiosRequestConfig = {
              ...error.config,
              customerAuth: { ...policy, replayed: true },
            };
            return client.request(replayConfig);
          } catch (refreshError) {
            const normalizedRefreshError = normalizeHttpFailure(refreshError);
            if (
              normalizedRefreshError.kind === 'configuration' ||
              (normalizedRefreshError.kind === 'http' &&
                TERMINAL_AUTH_CODES.has(normalizedRefreshError.code))
            ) {
              notifyTerminalAuthenticationLoss();
            }
            throw normalizedRefreshError;
          }
        }
        if (
          policy?.refreshEligible &&
          response &&
          (TERMINAL_AUTH_CODES.has(response.code) ||
            (policy.replayed && REFRESHABLE_AUTH_CODES.has(response.code)))
        ) {
          notifyTerminalAuthenticationLoss();
        }
      }
      throw normalizeHttpFailure(error);
    },
  );
  return client;
}

export const httpClient = createHttpClient();
