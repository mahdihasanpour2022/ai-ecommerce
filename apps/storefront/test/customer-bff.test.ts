import assert from 'node:assert/strict';
import test from 'node:test';
import { appendBackendResponseHeaders, backendHeaders } from '../app/http/server-api';

void test('forwards only Customer cookies and the CSRF header to Backend', () => {
  const request = new Request('http://storefront.local/api/v1/customer-auth/refresh', {
    headers: {
      cookie:
        'admin_access=secret; storefront_customer_access=access; storefront_customer_refresh=refresh; unrelated=value',
      'x-csrf-token': 'customer-csrf',
    },
  });

  const headers = backendHeaders(request);
  assert.equal(
    headers.get('cookie'),
    'storefront_customer_access=access; storefront_customer_refresh=refresh',
  );
  assert.equal(headers.get('x-csrf-token'), 'customer-csrf');
  assert.equal(headers.get('origin'), 'http://storefront.local');
});

void test('returns only Customer Set-Cookie values and always disables caching', () => {
  const source = new Headers();
  source.append('set-cookie', 'admin_access=secret; Path=/; HttpOnly');
  source.append('set-cookie', 'storefront_customer_access=access; Path=/; HttpOnly');
  source.append('set-cookie', 'storefront_customer_csrf=csrf; Path=/');
  source.set('cache-control', 'public, max-age=60');
  const target = new Headers();

  appendBackendResponseHeaders(target, source);

  assert.deepEqual(target.getSetCookie(), [
    'storefront_customer_access=access; Path=/; HttpOnly',
    'storefront_customer_csrf=csrf; Path=/',
  ]);
  assert.equal(target.get('cache-control'), 'no-store');
});
