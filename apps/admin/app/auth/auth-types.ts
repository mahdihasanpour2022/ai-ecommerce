export interface AdminIdentity {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
}

export interface CurrentAuthentication {
  readonly admin: AdminIdentity;
  readonly authorization: {
    readonly roles: readonly string[];
    readonly permissions: readonly string[];
  };
}

export type AuthErrorKind = 'connectivity' | 'forbidden' | 'server';

export type AuthState =
  | { readonly phase: 'bootstrapping' }
  | {
      readonly phase: 'authenticated';
      readonly current: CurrentAuthentication;
      readonly logout: { readonly submitting: boolean; readonly message: string | null };
    }
  | {
      readonly phase: 'unauthenticated';
      readonly message: string | null;
      readonly submitting: boolean;
    }
  | {
      readonly phase: 'error';
      readonly kind: AuthErrorKind;
      readonly message: string;
      readonly recoverable: boolean;
    };

export type AuthAction =
  | { readonly type: 'bootstrap-started' }
  | {
      readonly type: 'authenticated';
      readonly current: CurrentAuthentication;
    }
  | { readonly type: 'unauthenticated'; readonly message?: string }
  | {
      readonly type: 'failed';
      readonly kind: AuthErrorKind;
      readonly message: string;
      readonly recoverable: boolean;
    }
  | { readonly type: 'login-started' }
  | { readonly type: 'login-failed'; readonly message: string }
  | { readonly type: 'logout-started' }
  | { readonly type: 'logout-failed'; readonly message: string };

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'bootstrap-started':
      return { phase: 'bootstrapping' };
    case 'authenticated':
      return {
        phase: 'authenticated',
        current: action.current,
        logout: { submitting: false, message: null },
      };
    case 'unauthenticated':
      return { phase: 'unauthenticated', message: action.message ?? null, submitting: false };
    case 'failed':
      return {
        phase: 'error',
        kind: action.kind,
        message: action.message,
        recoverable: action.recoverable,
      };
    case 'login-started':
      return { phase: 'unauthenticated', message: null, submitting: true };
    case 'login-failed':
      return { phase: 'unauthenticated', message: action.message, submitting: false };
    case 'logout-started':
      return state.phase === 'authenticated'
        ? { ...state, logout: { submitting: true, message: null } }
        : state;
    case 'logout-failed':
      return state.phase === 'authenticated'
        ? { ...state, logout: { submitting: false, message: action.message } }
        : state;
  }
}
