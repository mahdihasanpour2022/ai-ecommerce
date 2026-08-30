import assert from 'node:assert/strict';
import test from 'node:test';
import axios from 'axios';
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import { createCsrfCredentialStore } from '../app/http/csrf-credential';
import { createHttpFailureChannel } from '../app/http/http-failure-channel';
import {
  AdminHttpError,
  DEFAULT_HTTP_TIMEOUT_MS,
  createHttpClient,
  getApiBaseUrl,
  normalizeHttpFailure,
} from '../app/http/http-client';

function successfulAdapter(calls: InternalAxiosRequestConfig[]): AxiosAdapter {
  return async (config) => {
    calls.push(config);
    return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config };
  };
}

void test('configures the validated base URL, cookies, JSON, and 20-second timeout', async () => {
  const calls: InternalAxiosRequestConfig[] = [];
  const client = createHttpClient({
    adapter: successfulAdapter(calls),
    baseURL: 'https://api.example.com/api/v1',
  });

  await client.get('/resource');
  const call = calls[0];
  assert.ok(call);
  assert.equal(call.baseURL, 'https://api.example.com/api/v1');
  assert.equal(call.withCredentials, true);
  assert.equal(call.timeout, DEFAULT_HTTP_TIMEOUT_MS);
  assert.equal(call.transitional?.clarifyTimeoutError, true);
  assert.equal(call.headers.get('Accept'), 'application/json');
  assert.equal(call.headers.has('Authorization'), false);
});

void test('attaches current memory-only CSRF only to unsafe required requests', async () => {
  const calls: InternalAxiosRequestConfig[] = [];
  const credentials = createCsrfCredentialStore();
  credentials.set('session-csrf');
  const client = createHttpClient({
    adapter: successfulAdapter(calls),
    baseURL: 'https://api.example.com/api/v1',
    credentials,
  });

  await client.post(
    '/protected',
    {},
    {
      authPolicy: { csrf: 'required', failure: 'global', refresh: 'eligible' },
    },
  );
  await client.get('/safe', {
    authPolicy: { csrf: 'required', failure: 'global', refresh: 'eligible' },
    headers: { 'X-CSRF-Token': 'caller-value' },
  });
  await client.post(
    '/auth/login',
    {},
    {
      authPolicy: { csrf: 'omit', failure: 'caller', refresh: 'never' },
      headers: { 'X-CSRF-Token': 'caller-value' },
    },
  );

  assert.equal(calls[0]?.headers.get('X-CSRF-Token'), 'session-csrf');
  assert.equal(calls[1]?.headers.has('X-CSRF-Token'), false);
  assert.equal(calls[2]?.headers.has('X-CSRF-Token'), false);
});

void test('fails closed for a missing required CSRF credential or any Authorization header', async () => {
  let adapterCalls = 0;
  const adapter: AxiosAdapter = async (config) => {
    adapterCalls += 1;
    return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
  };
  const client = createHttpClient({ adapter, baseURL: 'https://api.example.com/api/v1' });

  await assert.rejects(client.post('/protected', {}), (error: unknown) => {
    assert.ok(error instanceof AdminHttpError);
    assert.equal(error.kind, 'configuration');
    assert.equal(error.code, 'CSRF_CREDENTIAL_REQUIRED');
    return true;
  });
  await assert.rejects(
    client.get('/safe', { headers: { Authorization: 'Bearer forbidden' } }),
    (error: unknown) => {
      assert.ok(error instanceof AdminHttpError);
      assert.equal(error.code, 'AUTHORIZATION_HEADER_FORBIDDEN');
      return true;
    },
  );
  assert.equal(adapterCalls, 0);
});

void test('classifies HTTP, timeout, cancellation, network, and unexpected failures', () => {
  const http = normalizeHttpFailure({
    isAxiosError: true,
    response: {
      status: 429,
      data: { code: 'AUTH_RATE_LIMITED' },
      headers: { 'retry-after': '30' },
    },
  });
  assert.deepEqual(
    { kind: http.kind, status: http.status, code: http.code, retryAfter: http.retryAfter },
    { kind: 'http', status: 429, code: 'AUTH_RATE_LIMITED', retryAfter: '30' },
  );
  assert.equal(normalizeHttpFailure({ isAxiosError: true, code: 'ETIMEDOUT' }).kind, 'timeout');
  assert.equal(normalizeHttpFailure(new axios.CanceledError()).kind, 'canceled');
  assert.equal(normalizeHttpFailure({ isAxiosError: true, code: 'ERR_NETWORK' }).kind, 'network');
  assert.equal(normalizeHttpFailure(new Error('programming error')).kind, 'configuration');
});

void test('does not retry a transport failure implicitly', async () => {
  let calls = 0;
  const adapter: AxiosAdapter = async (config) => {
    calls += 1;
    throw new axios.AxiosError('network', 'ERR_NETWORK', config);
  };
  const client = createHttpClient({ adapter, baseURL: 'https://api.example.com/api/v1' });

  await assert.rejects(client.get('/resource'), { kind: 'network', code: 'NETWORK_ERROR' });
  assert.equal(calls, 1);
});

void test('publishes global failures once and leaves caller-handled auth failures local', async () => {
  const channel = createHttpFailureChannel();
  const published: AdminHttpError[] = [];
  channel.subscribe((error) => published.push(error));
  let calls = 0;
  const adapter: AxiosAdapter = async (config) => {
    calls += 1;
    throw new axios.AxiosError('network', 'ERR_NETWORK', config);
  };
  const client = createHttpClient({
    adapter,
    baseURL: 'https://api.example.com/api/v1',
    failurePublisher: channel,
  });

  await assert.rejects(client.get('/global'));
  await assert.rejects(
    client.get('/caller', {
      authPolicy: { csrf: 'omit', failure: 'caller', refresh: 'never' },
    }),
  );
  assert.equal(calls, 2);
  assert.equal(published.length, 1);
  assert.equal(published[0]?.kind, 'network');
});

void test('validates public API base URLs', () => {
  assert.equal(getApiBaseUrl(undefined), 'http://localhost:3002/api/v1');
  assert.equal(getApiBaseUrl('https://api.example.com/api/v1/'), 'https://api.example.com/api/v1');
  assert.throws(() => getApiBaseUrl('https://user:pass@example.com/api/v1'));
  assert.throws(() => getApiBaseUrl('javascript:alert(1)'));
});
