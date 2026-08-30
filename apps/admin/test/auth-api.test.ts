import assert from 'node:assert/strict';
import test from 'node:test';
import { AuthApiError, createAuthApi, getApiBaseUrl } from '../app/auth/auth-api';

void test('uses the safe local default and validates public API origins', () => {
  assert.equal(getApiBaseUrl(undefined), 'http://localhost:3002/api/v1');
  assert.equal(getApiBaseUrl('https://api.example.com/api/v1/'), 'https://api.example.com/api/v1');
  assert.throws(() => getApiBaseUrl('https://user:pass@example.com/api/v1'));
  assert.throws(() => getApiBaseUrl('javascript:alert(1)'));
});

void test('bootstraps CSRF and identity with credentialed requests and no Bearer header', async () => {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const responses = [
    Response.json({ csrfToken: 'csrf-value' }),
    Response.json({
      admin: { id: 'admin-1', email: 'admin@example.com', displayName: 'مدیر آزمون' },
      authorization: { roles: ['SUPER_ADMIN'], permissions: ['admin.access'] },
    }),
  ];
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, ...(init ? { init } : {}) });
    const response = responses.shift();
    if (!response) throw new Error('Unexpected request.');
    return response;
  }) as typeof fetch;
  const api = createAuthApi(fetcher, 'https://api.example.com/api/v1');

  assert.equal(await api.bootstrapCsrf(), 'csrf-value');
  assert.equal((await api.current()).admin.email, 'admin@example.com');
  assert.equal(calls.length, 2);
  for (const call of calls) {
    assert.equal(call.init?.credentials, 'include');
    const headers = new Headers(call.init?.headers);
    assert.equal(headers.has('authorization'), false);
    assert.equal(headers.has('x-csrf-token'), false);
  }
});

void test('submits login JSON once without retaining it in the adapter', async () => {
  let captured: RequestInit | undefined;
  const fetcher = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    captured = init;
    return Response.json({ csrfToken: 'new-csrf' });
  }) as typeof fetch;
  const api = createAuthApi(fetcher, 'https://api.example.com/api/v1');

  assert.equal(await api.login('admin@example.com', 'transient-password'), 'new-csrf');
  assert.equal(captured?.method, 'POST');
  assert.equal(captured?.credentials, 'include');
  assert.deepEqual(JSON.parse(String(captured?.body)) as unknown, {
    email: 'admin@example.com',
    password: 'transient-password',
  });
});

void test('preserves stable error code, status, and Retry-After without exposing backend details', async () => {
  const fetcher = (async () =>
    Response.json(
      { statusCode: 429, code: 'AUTH_RATE_LIMITED', message: 'safe' },
      { status: 429, headers: { 'Retry-After': '30' } },
    )) as typeof fetch;
  const api = createAuthApi(fetcher, 'https://api.example.com/api/v1');

  await assert.rejects(api.login('admin@example.com', 'password'), (error: unknown) => {
    assert.ok(error instanceof AuthApiError);
    assert.equal(error.status, 429);
    assert.equal(error.code, 'AUTH_RATE_LIMITED');
    assert.equal(error.retryAfter, '30');
    return true;
  });
});
