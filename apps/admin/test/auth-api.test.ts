import assert from 'node:assert/strict';
import test from 'node:test';
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import { createAuthApi } from '../app/auth/auth-api';
import { createCsrfCredentialStore } from '../app/http/csrf-credential';
import { createHttpClient } from '../app/http/http-client';

void test('uses the centralized client for login, CSRF bootstrap, and current identity', async () => {
  const calls: InternalAxiosRequestConfig[] = [];
  const credentials = createCsrfCredentialStore();
  credentials.set('session-csrf');
  const adapter: AxiosAdapter = async (config) => {
    calls.push(config);
    const data =
      config.url === '/auth/me'
        ? {
            admin: { id: 'admin-1', email: 'admin@example.com', displayName: 'مدیر آزمون' },
            authorization: { roles: ['SUPER_ADMIN'], permissions: ['admin.access'] },
          }
        : { csrfToken: 'csrf-value' };
    return { data, status: 200, statusText: 'OK', headers: {}, config };
  };
  const client = createHttpClient({
    adapter,
    baseURL: 'https://api.example.com/api/v1',
    credentials,
  });
  const api = createAuthApi(client);

  assert.equal(await api.bootstrapCsrf(), 'csrf-value');
  assert.equal(await api.login('admin@example.com', 'transient-password'), 'csrf-value');
  assert.equal((await api.current()).admin.email, 'admin@example.com');
  await api.logout();

  assert.equal(calls.length, 4);
  assert.deepEqual(
    calls.map((call) => call.authPolicy),
    [
      { csrf: 'omit', failure: 'caller', refresh: 'never' },
      { csrf: 'omit', failure: 'caller', refresh: 'never' },
      { csrf: 'omit', failure: 'caller', refresh: 'eligible' },
      { csrf: 'required', failure: 'caller', refresh: 'never' },
    ],
  );
  assert.deepEqual(JSON.parse(String(calls[1]?.data)) as unknown, {
    email: 'admin@example.com',
    password: 'transient-password',
  });
  for (const call of calls.slice(0, 3)) {
    assert.equal(call.withCredentials, true);
    assert.equal(call.headers.has('Authorization'), false);
    assert.equal(call.headers.has('X-CSRF-Token'), false);
  }
  assert.equal(calls[3]?.data, undefined);
  assert.equal(calls[3]?.headers.get('X-CSRF-Token'), 'session-csrf');
  assert.equal(calls[3]?.withCredentials, true);
  assert.equal(calls[3]?.headers.has('Authorization'), false);
});

void test('rejects malformed success responses without exposing response data', async () => {
  const adapter: AxiosAdapter = async (config) => ({
    data: { unexpected: 'value' },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  });
  const api = createAuthApi(
    createHttpClient({ adapter, baseURL: 'https://api.example.com/api/v1' }),
  );

  await assert.rejects(api.bootstrapCsrf(), { code: 'INVALID_RESPONSE', status: 502 });
  await assert.rejects(api.current(), { code: 'INVALID_RESPONSE', status: 502 });
});
