import axios from 'axios';
import type {
  AxiosAdapter,
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';
import { csrfCredentialStore } from './csrf-credential';
import type { CsrfCredentialStore } from './csrf-credential';
import { httpFailureChannel } from './http-failure-channel';
import type { HttpFailurePublisher } from './http-failure-channel';
import { createRefreshCoordinator, requestSessionRefresh } from './refresh-coordinator';

export const DEFAULT_HTTP_TIMEOUT_MS = 20_000;
const DEFAULT_API_BASE_URL = 'http://localhost:3002/api/v1';
const SAFE_METHODS = new Set(['get', 'head', 'options']);

export interface AuthRequestPolicy {
  readonly csrf: 'omit' | 'required';
  readonly failure: 'caller' | 'global';
  readonly refresh: 'eligible' | 'never';
}

declare module 'axios' {
  interface AxiosRequestConfig {
    authPolicy?: AuthRequestPolicy;
    authRecoveryAttempted?: boolean;
  }

  interface InternalAxiosRequestConfig {
    authPolicy?: AuthRequestPolicy;
    authRecoveryAttempted?: boolean;
  }
}

export type HttpFailureKind = 'canceled' | 'configuration' | 'http' | 'network' | 'timeout';

export class AdminHttpError extends Error {
  constructor(
    readonly kind: HttpFailureKind,
    readonly status: number | null,
    readonly code: string,
    readonly retryAfter: string | null = null,
    readonly details: readonly string[] = [],
  ) {
    super(`Admin HTTP request failed: ${kind}/${status ?? 'no-status'}/${code}.`);
    this.name = 'AdminHttpError';
  }
}

class RequestPolicyError extends Error {
  constructor(readonly policyCode: string) {
    super(`Admin HTTP request policy rejected the request: ${policyCode}.`);
    this.name = 'RequestPolicyError';
  }
}

export function getApiBaseUrl(value = process.env.NEXT_PUBLIC_API_BASE_URL): string {
  const candidate = value?.trim() || DEFAULT_API_BASE_URL;
  const url = new URL(candidate);
  if (
    (url.protocol !== 'http:' && url.protocol !== 'https:') ||
    url.username !== '' ||
    url.password !== '' ||
    url.search !== '' ||
    url.hash !== ''
  ) {
    throw new Error(
      'NEXT_PUBLIC_API_BASE_URL must be an HTTP(S) URL without credentials, query, or hash.',
    );
  }
  return url.toString().replace(/\/$/, '');
}

function isSafeMethod(method: string | undefined): boolean {
  return SAFE_METHODS.has((method ?? 'get').toLowerCase());
}

function applySecurityPolicy(
  config: InternalAxiosRequestConfig,
  credentials: CsrfCredentialStore,
): InternalAxiosRequestConfig {
  if (config.headers.has('Authorization')) {
    throw new RequestPolicyError('AUTHORIZATION_HEADER_FORBIDDEN');
  }

  const policy = config.authPolicy ?? {
    csrf: isSafeMethod(config.method) ? 'omit' : 'required',
    failure: 'global',
    refresh: 'never',
  };
  config.authPolicy = policy;

  if (policy.csrf === 'omit' || isSafeMethod(config.method)) {
    config.headers.delete('X-CSRF-Token');
    return config;
  }

  const credential = credentials.get();
  if (!credential) throw new RequestPolicyError('CSRF_CREDENTIAL_REQUIRED');
  config.headers.set('X-CSRF-Token', credential);
  return config;
}

function responseCode(error: AxiosError): string {
  const data: unknown = error.response?.data;
  if (typeof data === 'object' && data !== null && 'code' in data) {
    const code = (data as { readonly code?: unknown }).code;
    if (typeof code === 'string' && code.length > 0) return code;
  }
  return 'UNKNOWN_ERROR';
}

function responseDetails(error: AxiosError): readonly string[] {
  const data: unknown = error.response?.data;
  if (typeof data !== 'object' || data === null || !('details' in data)) return [];
  const details = (data as { readonly details?: unknown }).details;
  if (!Array.isArray(details)) return [];
  return details
    .slice(0, 20)
    .filter(
      (detail): detail is string =>
        typeof detail === 'string' && /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/u.test(detail),
    );
}

function isRefreshEligible(
  error: unknown,
): error is AxiosError & { config: InternalAxiosRequestConfig } {
  return (
    axios.isAxiosError(error) &&
    !axios.isCancel(error) &&
    error.response?.status === 401 &&
    responseCode(error) === 'ACCESS_TOKEN_EXPIRED' &&
    error.config?.authPolicy?.refresh === 'eligible' &&
    error.config.signal?.aborted !== true &&
    error.config.authRecoveryAttempted !== true
  );
}

export function normalizeHttpFailure(error: unknown): AdminHttpError {
  if (error instanceof AdminHttpError) return error;
  if (error instanceof RequestPolicyError) {
    return new AdminHttpError('configuration', null, error.policyCode);
  }
  if (axios.isCancel(error)) return new AdminHttpError('canceled', null, 'REQUEST_CANCELED');
  if (!axios.isAxiosError(error))
    return new AdminHttpError('configuration', null, 'UNEXPECTED_CLIENT_ERROR');
  if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
    return new AdminHttpError('timeout', null, 'REQUEST_TIMEOUT');
  }
  if (error.response) {
    return new AdminHttpError(
      'http',
      error.response.status,
      responseCode(error),
      error.response.headers['retry-after']?.toString() ?? null,
      responseDetails(error),
    );
  }
  return new AdminHttpError('network', null, 'NETWORK_ERROR');
}

export interface CreateHttpClientOptions {
  readonly baseURL?: string;
  readonly credentials?: CsrfCredentialStore;
  readonly failurePublisher?: HttpFailurePublisher;
  readonly adapter?: AxiosAdapter;
}

export function createHttpClient(options: CreateHttpClientOptions = {}): AxiosInstance {
  const config: AxiosRequestConfig = {
    baseURL: options.baseURL ?? getApiBaseUrl(),
    timeout: DEFAULT_HTTP_TIMEOUT_MS,
    withCredentials: true,
    headers: { Accept: 'application/json' },
    transitional: { clarifyTimeoutError: true },
    ...(options.adapter ? { adapter: options.adapter } : {}),
  };
  const client = axios.create(config);
  const credentials = options.credentials ?? csrfCredentialStore;
  const failurePublisher = options.failurePublisher ?? httpFailureChannel;
  const publishedFailures = new WeakSet<AdminHttpError>();

  function rejectFailure(error: unknown, failureHandling?: AuthRequestPolicy['failure']) {
    const normalized = normalizeHttpFailure(error);
    if (
      normalized.kind !== 'canceled' &&
      failureHandling !== 'caller' &&
      !publishedFailures.has(normalized)
    ) {
      publishedFailures.add(normalized);
      failurePublisher.publish(normalized);
    }
    return Promise.reject(normalized);
  }

  client.interceptors.request.use((request) => applySecurityPolicy(request, credentials));
  const refreshCoordinator = createRefreshCoordinator(() => requestSessionRefresh(client));
  client.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
      const failureHandling = axios.isAxiosError(error)
        ? error.config?.authPolicy?.failure
        : undefined;

      if (axios.isAxiosError(error) && error.config?.signal?.aborted) {
        return rejectFailure(
          new AdminHttpError('canceled', null, 'REQUEST_CANCELED'),
          failureHandling,
        );
      }

      if (!isRefreshEligible(error)) return rejectFailure(error, failureHandling);

      const original = error.config;
      try {
        await refreshCoordinator.recover();
      } catch (refreshError) {
        return rejectFailure(refreshError, failureHandling);
      }

      if (original.signal?.aborted) {
        return rejectFailure(
          new AdminHttpError('canceled', null, 'REQUEST_CANCELED'),
          failureHandling,
        );
      }

      return client.request({ ...original, authRecoveryAttempted: true });
    },
  );
  return client;
}

export const httpClient = createHttpClient();
