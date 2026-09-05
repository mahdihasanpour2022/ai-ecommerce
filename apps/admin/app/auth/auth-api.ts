import { AdminHttpError, httpClient } from '../http/http-client';
import type { AxiosInstance } from 'axios';
import type { CurrentAuthentication } from './auth-types';
import { parseCurrentAuthentication } from './session-contract';

export interface AuthApi {
  login(identifier: string, password: string, signal?: AbortSignal): Promise<CurrentAuthentication>;
  logout(signal?: AbortSignal): Promise<void>;
}

function requireCurrent(body: unknown): CurrentAuthentication {
  const current = parseCurrentAuthentication(body);
  if (current === null) throw new AdminHttpError('http', 502, 'INVALID_RESPONSE');
  return current;
}

export function createAuthApi(client: AxiosInstance = httpClient): AuthApi {
  return {
    async login(identifier, password, signal) {
      const response = await client.post<unknown>(
        '/auth/login',
        { identifier, password },
        {
          ...(signal ? { signal } : {}),
          authPolicy: { csrf: 'omit', failure: 'caller', refresh: 'never' },
        },
      );
      return requireCurrent(response.data);
    },
    async logout(signal) {
      await client.post('/auth/logout', undefined, {
        ...(signal ? { signal } : {}),
        authPolicy: { csrf: 'required', failure: 'caller', refresh: 'never' },
      });
    },
  };
}
