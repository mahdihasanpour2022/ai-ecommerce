import assert from 'node:assert/strict';
import test from 'node:test';
import { AuthApiError } from '../app/auth/auth-api';
import {
  ACCOUNT_DISABLED_MESSAGE,
  CONNECTIVITY_MESSAGE,
  FORBIDDEN_MESSAGE,
  INVALID_CREDENTIALS_MESSAGE,
  RATE_LIMIT_MESSAGE,
  mapBootstrapFailure,
  mapLoginFailure,
} from '../app/auth/auth-errors';
import { authReducer } from '../app/auth/auth-types';
import type { AuthState, CurrentAuthentication } from '../app/auth/auth-types';

const initial: AuthState = { phase: 'bootstrapping' };
const current: CurrentAuthentication = {
  admin: { id: 'admin-1', email: 'admin@example.com', displayName: 'مدیر آزمون' },
  authorization: { roles: ['SUPER_ADMIN'], permissions: ['admin.access'] },
};

void test('moves through login pending, failure, and authenticated states without persistence', () => {
  const pending = authReducer(initial, { type: 'login-started' });
  assert.deepEqual(pending, { phase: 'unauthenticated', message: null, submitting: true });

  const failed = authReducer(pending, {
    type: 'login-failed',
    message: INVALID_CREDENTIALS_MESSAGE,
  });
  assert.deepEqual(failed, {
    phase: 'unauthenticated',
    message: INVALID_CREDENTIALS_MESSAGE,
    submitting: false,
  });

  const authenticated = authReducer(failed, {
    type: 'authenticated',
    current,
    csrfToken: 'memory-only',
  });
  assert.equal(authenticated.phase, 'authenticated');
  if (authenticated.phase === 'authenticated') {
    assert.equal(authenticated.current.admin.email, 'admin@example.com');
    assert.equal(authenticated.csrfToken, 'memory-only');
  }
});

void test('maps definitive bootstrap and recoverable connectivity outcomes distinctly', () => {
  assert.deepEqual(mapBootstrapFailure(new AuthApiError(401, 'AUTHENTICATION_REQUIRED', null)), {
    type: 'unauthenticated',
  });
  assert.deepEqual(mapBootstrapFailure(new AuthApiError(401, 'ACCOUNT_DISABLED', null)), {
    type: 'unauthenticated',
    message: ACCOUNT_DISABLED_MESSAGE,
  });
  assert.deepEqual(mapBootstrapFailure(new AuthApiError(403, 'INSUFFICIENT_PERMISSION', null)), {
    type: 'failed',
    kind: 'forbidden',
    message: FORBIDDEN_MESSAGE,
    recoverable: false,
  });
  assert.deepEqual(mapBootstrapFailure(new TypeError('network unavailable')), {
    type: 'failed',
    kind: 'connectivity',
    message: CONNECTIVITY_MESSAGE,
    recoverable: true,
  });
});

void test('maps stable login codes to deterministic Persian feedback', () => {
  assert.equal(
    mapLoginFailure(new AuthApiError(401, 'INVALID_CREDENTIALS', null)),
    INVALID_CREDENTIALS_MESSAGE,
  );
  assert.equal(
    mapLoginFailure(new AuthApiError(429, 'AUTH_RATE_LIMITED', '30')),
    RATE_LIMIT_MESSAGE,
  );
  assert.equal(mapLoginFailure(new TypeError('offline')), CONNECTIVITY_MESSAGE);
});
