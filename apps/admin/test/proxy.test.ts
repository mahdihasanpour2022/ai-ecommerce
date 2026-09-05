import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { NextRequest } from 'next/server';
import { proxy } from '../proxy';
import { AUTH_STATE_HEADER, decodeAuthenticationHeader } from '../app/auth/server-auth-header';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function request(path: string, cookie?: string): NextRequest {
  return new NextRequest(`http://localhost:3001${path}`, {
    headers: cookie === undefined ? {} : { cookie },
  });
}

void test('redirects a protected route before render when Refresh is absent', async () => {
  let calls = 0;
  globalThis.fetch = () => {
    calls += 1;
    return Promise.reject(new Error('must not call'));
  };
  const response = await proxy(request('/catalog/products'));
  assert.equal(response.status, 307);
  assert.equal(
    response.headers.get('location'),
    'http://localhost:3001/login?returnTo=%2Fcatalog%2Fproducts',
  );
  assert.equal(calls, 0);
  assert.equal(response.headers.getSetCookie().length, 3);
});

void test('injects only validated Backend identity and forwards rotated cookies', async () => {
  const current = {
    admin: { id: 'admin-1', email: 'admin@example.com', displayName: 'مدیر آزمون' },
    authorization: { roles: ['SUPER_ADMIN'], permissions: ['admin.access'] },
    csrfToken: 'csrf-value',
  };
  globalThis.fetch = () => {
    const headers = new Headers({ 'content-type': 'application/json' });
    headers.append('set-cookie', 'admin_csrf_token=csrf-value; Path=/; SameSite=Strict');
    return Promise.resolve(Response.json(current, { headers }));
  };
  const response = await proxy(
    request('/catalog/products', 'admin_refresh_token=refresh-value; admin_access_token=access'),
  );
  assert.equal(response.status, 200);
  const encoded = response.headers.get(`x-middleware-request-${AUTH_STATE_HEADER}`);
  assert.deepEqual(decodeAuthenticationHeader(encoded), {
    admin: current.admin,
    authorization: current.authorization,
  });
  assert.equal(response.headers.getSetCookie().length, 1);
  assert.equal(response.headers.get('content-type'), null);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

void test('clears definitive failures but preserves cookies on Backend uncertainty', async () => {
  globalThis.fetch = () =>
    Promise.resolve(Response.json({ code: 'AUTHENTICATION_REQUIRED' }, { status: 401 }));
  const rejected = await proxy(request('/', 'admin_refresh_token=refresh-value'));
  assert.equal(rejected.status, 307);
  assert.equal(rejected.headers.getSetCookie().length, 3);

  globalThis.fetch = () => Promise.resolve(Response.json({}, { status: 500 }));
  const uncertain = await proxy(request('/', 'admin_refresh_token=refresh-value'));
  assert.equal(uncertain.status, 503);
  assert.equal(uncertain.headers.getSetCookie().length, 0);
});

void test('never trusts a client-supplied authentication state header on login', async () => {
  let calls = 0;
  globalThis.fetch = () => {
    calls += 1;
    return Promise.reject(new Error('must not call'));
  };
  const response = await proxy(
    new NextRequest('http://localhost:3001/login', {
      headers: { [AUTH_STATE_HEADER]: 'forged' },
    }),
  );
  assert.equal(response.status, 200);
  assert.equal(calls, 0);
  assert.equal(response.headers.get(`x-middleware-request-${AUTH_STATE_HEADER}`), null);
});
