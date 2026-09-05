import assert from 'node:assert/strict';
import test from 'node:test';
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import { createAuthApi } from '../app/auth/auth-api';
import { createCsrfCredentialStore } from '../app/http/csrf-credential';
import { createHttpClient } from '../app/http/http-client';

void test('uses the same-origin client for login and logout', async () => {
  const calls: InternalAxiosRequestConfig[] = [];
  const credentials = createCsrfCredentialStore();
  credentials.set('session-csrf');
  const adapter: AxiosAdapter = async (config) => {
    calls.push(config);
    return {
      data: {
        csrfToken: 'csrf-value',
        admin: { id: 'admin-1', email: 'admin@example.com', displayName: 'مدیر آزمون' },
        authorization: { roles: ['SUPER_ADMIN'], permissions: ['admin.access'] },
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  };
  const client = createHttpClient({ adapter, baseURL: '/api/v1', credentials });
  const api = createAuthApi(client);

  assert.equal((await api.login('admin_user', '654321')).admin.email, 'admin@example.com');
  await api.logout();

  assert.equal(calls.length, 2);
  assert.deepEqual(
    calls.map((call) => call.authPolicy),
    [
      { csrf: 'omit', failure: 'caller', refresh: 'never' },
      { csrf: 'required', failure: 'caller', refresh: 'never' },
    ],
  );
  assert.deepEqual(JSON.parse(String(calls[0]?.data)) as unknown, {
    identifier: 'admin_user',
    password: '654321',
  });
  assert.equal(calls[0]?.headers.has('Authorization'), false);
  assert.equal(calls[0]?.headers.has('X-CSRF-Token'), false);
  assert.equal(calls[1]?.data, undefined);
  assert.equal(calls[1]?.headers.get('X-CSRF-Token'), 'session-csrf');
  assert.equal(calls[1]?.headers.has('Authorization'), false);
});

void test('rejects malformed login success without exposing response data', async () => {
  const adapter: AxiosAdapter = async (config) => ({
    data: { unexpected: 'value' },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  });
  const api = createAuthApi(createHttpClient({ adapter, baseURL: '/api/v1' }));

  await assert.rejects(api.login('admin_user', '654321'), {
    code: 'INVALID_RESPONSE',
    status: 502,
  });
});
