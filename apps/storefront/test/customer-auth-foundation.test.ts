import assert from 'node:assert/strict';
import test from 'node:test';
import axios from 'axios';
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import {
  StorefrontHttpError,
  createHttpClient,
  onTerminalCustomerAuthenticationLoss,
} from '../app/http/http-client';
import { safeReturnDestination } from '../features/customer-auth/customer-auth';

function errorEnvelope(status: number, code: string) {
  return {
    statusCode: status,
    hasError: true,
    message: 'خطای آزمون.',
    code,
    count: 0,
    result: null,
    singleResult: null,
    details: null,
  };
}

function throwHttp(config: InternalAxiosRequestConfig, status: number, code: string): never {
  throw new axios.AxiosError('HTTP failure', 'ERR_BAD_RESPONSE', config, undefined, {
    data: errorEnvelope(status, code),
    status,
    statusText: 'Error',
    headers: {},
    config,
  });
}

void test('accepts only safe same-origin return destinations outside auth routes', () => {
  assert.equal(safeReturnDestination('/products?page=2#list'), '/products?page=2#list');
  assert.equal(safeReturnDestination('https://attacker.example'), '/');
  assert.equal(safeReturnDestination('//attacker.example/path'), '/');
  assert.equal(safeReturnDestination('/auth/verify'), '/');
  assert.equal(safeReturnDestination('/\\attacker.example'), '/');
});

void test('shares one Refresh and replays each eligible request exactly once', async () => {
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { cookie: 'storefront_customer_csrf=session-csrf' },
  });
  const calls = new Map<string, number>();
  let refreshCalls = 0;
  const adapter: AxiosAdapter = async (config) => {
    const url = config.url ?? '';
    calls.set(url, (calls.get(url) ?? 0) + 1);
    if (url === '/customer-auth/refresh') {
      refreshCalls += 1;
      assert.equal(config.headers.get('X-CSRF-Token'), 'session-csrf');
      await new Promise<void>((resolve) => setImmediate(resolve));
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
    }
    if (!config.customerAuth?.replayed) throwHttp(config, 401, 'ACCESS_TOKEN_EXPIRED');
    return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config };
  };
  const client = createHttpClient({ adapter });

  await Promise.all([
    client.get('/orders', { customerAuth: { refreshEligible: true } }),
    client.get('/profile', { customerAuth: { refreshEligible: true } }),
  ]);

  assert.equal(refreshCalls, 1);
  assert.equal(calls.get('/orders'), 2);
  assert.equal(calls.get('/profile'), 2);
});

void test('publishes terminal Refresh failure without replaying the request', async () => {
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { cookie: 'storefront_customer_csrf=session-csrf' },
  });
  let resourceCalls = 0;
  let terminalLosses = 0;
  const unsubscribe = onTerminalCustomerAuthenticationLoss(() => {
    terminalLosses += 1;
  });
  const adapter: AxiosAdapter = async (config) => {
    if (config.url === '/customer-auth/refresh') {
      throwHttp(config, 401, 'REFRESH_TOKEN_EXPIRED');
    }
    resourceCalls += 1;
    throwHttp(config, 401, 'AUTHENTICATION_REQUIRED');
  };
  const client = createHttpClient({ adapter });

  await assert.rejects(
    client.get('/orders', { customerAuth: { refreshEligible: true } }),
    (error: unknown) => error instanceof StorefrontHttpError && error.code === 'REFRESH_TOKEN_EXPIRED',
  );
  unsubscribe();
  assert.equal(resourceCalls, 1);
  assert.equal(terminalLosses, 1);
});
