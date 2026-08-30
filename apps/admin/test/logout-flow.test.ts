import assert from 'node:assert/strict';
import test from 'node:test';
import { CONNECTIVITY_MESSAGE } from '../app/auth/auth-errors';
import { performLogout } from '../app/auth/logout-flow';
import type { AuthAction } from '../app/auth/auth-types';
import { createCsrfCredentialStore } from '../app/http/csrf-credential';
import { AdminHttpError } from '../app/http/http-client';

function setup() {
  const credentials = createCsrfCredentialStore();
  credentials.set('session-csrf');
  const actions: AuthAction[] = [];
  return { credentials, actions, dispatch: (action: AuthAction) => actions.push(action) };
}

void test('clears memory credentials and authentication state after logout success', async () => {
  const context = setup();
  await performLogout({ logout: async () => undefined }, context.credentials, context.dispatch);

  assert.equal(context.credentials.get(), null);
  assert.deepEqual(context.actions, [{ type: 'logout-started' }, { type: 'unauthenticated' }]);
});

void test('retains authenticated credentials and exposes retryable connectivity failure', async () => {
  const context = setup();
  const failure = new AdminHttpError('network', null, 'NETWORK_ERROR');
  await assert.rejects(
    performLogout(
      {
        logout: async () => {
          throw failure;
        },
      },
      context.credentials,
      context.dispatch,
    ),
    (error: unknown) => error === failure,
  );

  assert.equal(context.credentials.get(), 'session-csrf');
  assert.deepEqual(context.actions, [
    { type: 'logout-started' },
    { type: 'logout-failed', message: CONNECTIVITY_MESSAGE },
  ]);
});

void test('clears credentials and transitions on definitive session loss', async () => {
  const context = setup();
  const failure = new AdminHttpError('http', 401, 'REFRESH_TOKEN_EXPIRED');
  await assert.rejects(
    performLogout(
      {
        logout: async () => {
          throw failure;
        },
      },
      context.credentials,
      context.dispatch,
    ),
    (error: unknown) => error === failure,
  );

  assert.equal(context.credentials.get(), null);
  assert.deepEqual(context.actions, [{ type: 'logout-started' }, { type: 'unauthenticated' }]);
});
