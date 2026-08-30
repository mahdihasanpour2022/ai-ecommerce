'use client';

import { createContext, useContext, useEffect, useReducer, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createAuthApi } from './auth-api';
import { mapBootstrapFailure, mapLoginFailure } from './auth-errors';
import { createSubmissionGate } from './submission-gate';
import { authReducer } from './auth-types';
import type { AuthState } from './auth-types';

interface AuthContextValue {
  readonly state: AuthState;
  login(email: string, password: string): Promise<void>;
  retryBootstrap(): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const api = createAuthApi();

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [state, dispatch] = useReducer(authReducer, { phase: 'bootstrapping' });
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);
  const loginGate = useRef(createSubmissionGate<readonly [string, string], void>());

  useEffect(() => {
    const controller = new AbortController();
    dispatch({ type: 'bootstrap-started' });

    async function bootstrap() {
      try {
        const csrfToken = await api.bootstrapCsrf(controller.signal);
        const current = await api.current(controller.signal);
        dispatch({ type: 'authenticated', current, csrfToken });
      } catch (error) {
        if (!controller.signal.aborted) dispatch(mapBootstrapFailure(error));
      }
    }

    void bootstrap();
    return () => controller.abort();
  }, [bootstrapAttempt]);

  async function performLogin(email: string, password: string): Promise<void> {
    dispatch({ type: 'login-started' });
    let csrfToken: string;
    try {
      csrfToken = await api.login(email, password);
    } catch (error) {
      dispatch({ type: 'login-failed', message: mapLoginFailure(error) });
      throw error;
    }

    try {
      const current = await api.current();
      dispatch({ type: 'authenticated', current, csrfToken });
    } catch (error) {
      dispatch(mapBootstrapFailure(error));
      throw error;
    }
  }

  const value: AuthContextValue = {
    state,
    login: (email, password) => loginGate.current.run(performLogin, email, password),
    retryBootstrap: () => setBootstrapAttempt((attempt) => attempt + 1),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider.');
  return value;
}
