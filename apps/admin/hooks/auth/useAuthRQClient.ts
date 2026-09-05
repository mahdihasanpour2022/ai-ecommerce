'use client';

import { useMemo } from 'react';
import type { AuthApi } from '../../app/auth/auth-api';
import { createAuthApi } from '../../app/auth/auth-api';
import type { CurrentAuthentication } from '../../app/auth/auth-types';
import { useRQSender } from '../rq_hooks/useRQSender';

interface LoginVariables {
  readonly identifier: string;
  readonly password: string;
  readonly signal?: AbortSignal;
}

const authApi = createAuthApi();

export function useAuthRQClient(baseClient: AuthApi = authApi): AuthApi {
  const loginMutation = useRQSender<CurrentAuthentication, LoginVariables>({
    mutationKey: ['auth', 'login'],
    mutationFn: ({ identifier, password, signal }) =>
      baseClient.login(identifier, password, signal),
  });
  const logoutMutation = useRQSender<void, AbortSignal | undefined>({
    mutationKey: ['auth', 'logout'],
    mutationFn: (signal) => baseClient.logout(signal),
  });
  const login = loginMutation.mutateAsync;
  const logout = logoutMutation.mutateAsync;
  return useMemo<AuthApi>(
    () => ({
      login: (identifier, password, signal) =>
        login({ identifier, password, ...(signal ? { signal } : {}) }),
      logout: (signal) => logout(signal),
    }),
    [login, logout],
  );
}
