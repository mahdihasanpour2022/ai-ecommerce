import type { CurrentAuthentication } from './auth-types';

export class AuthApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly retryAfter: string | null,
  ) {
    super(`Authentication request failed with ${status} ${code}.`);
    this.name = 'AuthApiError';
  }
}

export interface AuthApi {
  bootstrapCsrf(signal?: AbortSignal): Promise<string>;
  current(signal?: AbortSignal): Promise<CurrentAuthentication>;
  login(email: string, password: string, signal?: AbortSignal): Promise<string>;
}

const DEFAULT_API_BASE_URL = 'http://localhost:3002/api/v1';

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function requireSuccess(response: Response): Promise<unknown> {
  const body = await parseJson(response);
  if (!response.ok) {
    const code = isRecord(body) && typeof body.code === 'string' ? body.code : 'UNKNOWN_ERROR';
    throw new AuthApiError(response.status, code, response.headers.get('retry-after'));
  }
  return body;
}

function requireCsrf(body: unknown): string {
  if (!isRecord(body) || typeof body.csrfToken !== 'string' || body.csrfToken.length === 0) {
    throw new AuthApiError(502, 'INVALID_RESPONSE', null);
  }
  return body.csrfToken;
}

function requireCurrent(body: unknown): CurrentAuthentication {
  if (!isRecord(body) || !isRecord(body.admin) || !isRecord(body.authorization)) {
    throw new AuthApiError(502, 'INVALID_RESPONSE', null);
  }
  const { admin, authorization } = body;
  if (
    typeof admin.id !== 'string' ||
    typeof admin.email !== 'string' ||
    typeof admin.displayName !== 'string' ||
    !Array.isArray(authorization.roles) ||
    !authorization.roles.every((role) => typeof role === 'string') ||
    !Array.isArray(authorization.permissions) ||
    !authorization.permissions.every((permission) => typeof permission === 'string')
  ) {
    throw new AuthApiError(502, 'INVALID_RESPONSE', null);
  }
  return {
    admin: { id: admin.id, email: admin.email, displayName: admin.displayName },
    authorization: { roles: authorization.roles, permissions: authorization.permissions },
  };
}

export function createAuthApi(fetcher: typeof fetch = fetch, baseUrl = getApiBaseUrl()): AuthApi {
  const request = (path: string, init?: RequestInit) =>
    fetcher(`${baseUrl}${path}`, {
      ...init,
      credentials: 'include',
      headers: { Accept: 'application/json', ...init?.headers },
    });

  return {
    async bootstrapCsrf(signal) {
      return requireCsrf(
        await requireSuccess(await request('/auth/csrf', signal ? { signal } : undefined)),
      );
    },
    async current(signal) {
      return requireCurrent(
        await requireSuccess(await request('/auth/me', signal ? { signal } : undefined)),
      );
    },
    async login(email, password, signal) {
      const response = await request('/auth/login', {
        method: 'POST',
        ...(signal ? { signal } : {}),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      return requireCsrf(await requireSuccess(response));
    },
  };
}
