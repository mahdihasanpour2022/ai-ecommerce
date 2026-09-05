'use client';

import { createContext, useContext, useEffect, useReducer, useRef } from 'react';
import type { ReactNode } from 'react';
import { createAuthApi } from './auth-api';
import { applyCredentialPolicy, mapBootstrapFailure, mapLoginFailure } from './auth-errors';
import { createSubmissionGate } from './submission-gate';
import { authReducer } from './auth-types';
import type { AuthState, CurrentAuthentication } from './auth-types';
import { performLogout } from './logout-flow';
import { csrfCredentialStore } from '../http/csrf-credential';
import { httpFailureChannel } from '../http/http-failure-channel';

interface AuthContextValue {
  readonly state: AuthState;
  login(identifier: string, password: string): Promise<void>;
  logout(): Promise<void>;
  retryBootstrap(): void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const api = createAuthApi();

function dispatchBootstrapFailure(
  error: unknown,
  dispatch: React.Dispatch<Parameters<typeof authReducer>[1]>,
) {
  const action = mapBootstrapFailure(error);
  applyCredentialPolicy(action, csrfCredentialStore);
  dispatch(action);
}

export function AuthProvider({
  children,
  initialCurrent,
}: Readonly<{ children: ReactNode; initialCurrent: CurrentAuthentication | null }>) {
  const [state, dispatch] = useReducer(
    authReducer,
    initialCurrent === null
      ? { phase: 'unauthenticated', message: null, submitting: false }
      : authReducer({ phase: 'bootstrapping' }, { type: 'authenticated', current: initialCurrent }),
  );
  const loginGate = useRef(createSubmissionGate<readonly [string, string], void>());
  const logoutGate = useRef(createSubmissionGate<readonly [], void>());

  useEffect(
    () =>
      httpFailureChannel.subscribe((error) => {
        dispatchBootstrapFailure(error, dispatch);
      }),
    [],
  );

  async function performLogin(identifier: string, password: string): Promise<void> {
    dispatch({ type: 'login-started' });
    csrfCredentialStore.clear();
    try {
      const current = await api.login(identifier, password);
      dispatch({ type: 'authenticated', current });
    } catch (error) {
      csrfCredentialStore.clear();
      dispatch({ type: 'login-failed', message: mapLoginFailure(error) });
      throw error;
    }
  }

  const value: AuthContextValue = {
    state,
    login: (identifier, password) => loginGate.current.run(performLogin, identifier, password),
    logout: () => logoutGate.current.run(() => performLogout(api, csrfCredentialStore, dispatch)),
    retryBootstrap: () => window.location.reload(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider.');
  return value;
}
