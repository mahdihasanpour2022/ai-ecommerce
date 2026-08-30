import { AdminHttpError, httpClient } from '../http/http-client';
import type { AxiosInstance } from 'axios';
import type { CurrentAuthentication } from './auth-types';

export interface AuthApi {
  bootstrapCsrf(signal?: AbortSignal): Promise<string>;
  current(signal?: AbortSignal): Promise<CurrentAuthentication>;
  login(email: string, password: string, signal?: AbortSignal): Promise<string>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function requireCsrf(body: unknown): string {
  if (!isRecord(body) || typeof body.csrfToken !== 'string' || body.csrfToken.length === 0) {
    throw new AdminHttpError('http', 502, 'INVALID_RESPONSE');
  }
  return body.csrfToken;
}

function requireCurrent(body: unknown): CurrentAuthentication {
  if (!isRecord(body) || !isRecord(body.admin) || !isRecord(body.authorization)) {
    throw new AdminHttpError('http', 502, 'INVALID_RESPONSE');
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
    throw new AdminHttpError('http', 502, 'INVALID_RESPONSE');
  }
  return {
    admin: { id: admin.id, email: admin.email, displayName: admin.displayName },
    authorization: { roles: authorization.roles, permissions: authorization.permissions },
  };
}

export function createAuthApi(client: AxiosInstance = httpClient): AuthApi {
  return {
    async bootstrapCsrf(signal) {
      const response = await client.get<unknown>('/auth/csrf', {
        ...(signal ? { signal } : {}),
        authPolicy: { csrf: 'omit', failure: 'caller', refresh: 'never' },
      });
      return requireCsrf(response.data);
    },
    async current(signal) {
      const response = await client.get<unknown>('/auth/me', {
        ...(signal ? { signal } : {}),
        authPolicy: { csrf: 'omit', failure: 'caller', refresh: 'eligible' },
      });
      return requireCurrent(response.data);
    },
    async login(email, password, signal) {
      const response = await client.post<unknown>(
        '/auth/login',
        { email, password },
        {
          ...(signal ? { signal } : {}),
          authPolicy: { csrf: 'omit', failure: 'caller', refresh: 'never' },
        },
      );
      return requireCsrf(response.data);
    },
  };
}
