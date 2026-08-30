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
  }

  interface InternalAxiosRequestConfig {
    authPolicy?: AuthRequestPolicy;
  }
}

export type HttpFailureKind = 'canceled' | 'configuration' | 'http' | 'network' | 'timeout';

export class AdminHttpError extends Error {
  constructor(
    readonly kind: HttpFailureKind,
    readonly status: number | null,
    readonly code: string,
    readonly retryAfter: string | null = null,
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

  client.interceptors.request.use((request) => applySecurityPolicy(request, credentials));
  client.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
      const normalized = normalizeHttpFailure(error);
      const failureHandling = axios.isAxiosError(error)
        ? error.config?.authPolicy?.failure
        : undefined;
      if (failureHandling !== 'caller') failurePublisher.publish(normalized);
      return Promise.reject(normalized);
    },
  );
  return client;
}

export const httpClient = createHttpClient();
