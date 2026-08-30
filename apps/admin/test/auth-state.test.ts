import assert from 'node:assert/strict';
import test from 'node:test';
import { AdminHttpError } from '../app/http/http-client';
import {
  ACCOUNT_DISABLED_MESSAGE,
  CONNECTIVITY_MESSAGE,
  CSRF_MESSAGE,
  FORBIDDEN_MESSAGE,
  INVALID_CREDENTIALS_MESSAGE,
  RATE_LIMIT_MESSAGE,
  applyCredentialPolicy,
  mapBootstrapFailure,
  mapLoginFailure,
} from '../app/auth/auth-errors';
import { createCsrfCredentialStore } from '../app/http/csrf-credential';
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

  const authenticated = authReducer(failed, { type: 'authenticated', current });
  assert.equal(authenticated.phase, 'authenticated');
  if (authenticated.phase === 'authenticated') {
    assert.equal(authenticated.current.admin.email, 'admin@example.com');
  }
});

void test('maps definitive bootstrap and recoverable connectivity outcomes distinctly', () => {
  assert.deepEqual(
    mapBootstrapFailure(new AdminHttpError('http', 401, 'AUTHENTICATION_REQUIRED')),
    {
      type: 'unauthenticated',
    },
  );
  assert.deepEqual(mapBootstrapFailure(new AdminHttpError('http', 401, 'ACCOUNT_DISABLED')), {
    type: 'unauthenticated',
    message: ACCOUNT_DISABLED_MESSAGE,
  });
  assert.deepEqual(
    mapBootstrapFailure(new AdminHttpError('http', 403, 'INSUFFICIENT_PERMISSION')),
    {
      type: 'failed',
      kind: 'forbidden',
      message: FORBIDDEN_MESSAGE,
      recoverable: false,
    },
  );
  assert.deepEqual(mapBootstrapFailure(new AdminHttpError('network', null, 'NETWORK_ERROR')), {
    type: 'failed',
    kind: 'connectivity',
    message: CONNECTIVITY_MESSAGE,
    recoverable: true,
  });
});

void test('maps stable login codes to deterministic Persian feedback', () => {
  assert.equal(
    mapLoginFailure(new AdminHttpError('http', 401, 'INVALID_CREDENTIALS')),
    INVALID_CREDENTIALS_MESSAGE,
  );
  assert.equal(
    mapLoginFailure(new AdminHttpError('http', 429, 'AUTH_RATE_LIMITED', '30')),
    RATE_LIMIT_MESSAGE,
  );
  assert.equal(
    mapLoginFailure(new AdminHttpError('timeout', null, 'REQUEST_TIMEOUT')),
    CONNECTIVITY_MESSAGE,
  );
});

void test('keeps credentials for recoverable uncertainty and clears definitive auth outcomes', () => {
  const credentials = createCsrfCredentialStore();
  credentials.set('session-csrf');
  applyCredentialPolicy(
    { type: 'failed', kind: 'connectivity', message: CONNECTIVITY_MESSAGE, recoverable: true },
    credentials,
  );
  assert.equal(credentials.get(), 'session-csrf');

  applyCredentialPolicy({ type: 'unauthenticated' }, credentials);
  assert.equal(credentials.get(), null);

  credentials.set('new-session-csrf');
  applyCredentialPolicy(
    { type: 'failed', kind: 'forbidden', message: FORBIDDEN_MESSAGE, recoverable: false },
    credentials,
  );
  assert.equal(credentials.get(), null);
});

void test('maps CSRF rejection to the stable recoverable Persian request message', () => {
  assert.deepEqual(mapBootstrapFailure(new AdminHttpError('http', 403, 'CSRF_VALIDATION_FAILED')), {
    type: 'failed',
    kind: 'server',
    message: CSRF_MESSAGE,
    recoverable: true,
  });
});
