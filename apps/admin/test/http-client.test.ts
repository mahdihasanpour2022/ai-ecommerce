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
import { createRefreshCoordinator } from '../app/http/refresh-coordinator';

interface Deferred<T> {
  readonly promise: Promise<T>;
  resolve(value: T): void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

function throwHttp(config: InternalAxiosRequestConfig, status: number, code: string): never {
  throw new axios.AxiosError('HTTP failure', 'ERR_BAD_RESPONSE', config, undefined, {
    data: { code },
    status,
    statusText: 'Error',
    headers: {},
    config,
  });
}

async function waitFor(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (predicate()) return;
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  assert.fail('Timed out waiting for deterministic test condition.');
}

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

void test('attaches the current CSRF-cookie value only to unsafe required requests', async () => {
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
      data: {
        code: 'AUTH_RATE_LIMITED',
        details: ['name', 'parentId', 'unsafe detail with spaces', 42],
      },
      headers: { 'retry-after': '30' },
    },
  });
  assert.deepEqual(
    {
      kind: http.kind,
      status: http.status,
      code: http.code,
      retryAfter: http.retryAfter,
      details: http.details,
    },
    {
      kind: 'http',
      status: 429,
      code: 'AUTH_RATE_LIMITED',
      retryAfter: '30',
      details: ['name', 'parentId'],
    },
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

void test('defaults to the same-origin BFF and validates explicit API locations', () => {
  assert.equal(getApiBaseUrl(undefined), '/api/v1');
  assert.equal(getApiBaseUrl('/api/v1/'), '/api/v1');
  assert.throws(() => getApiBaseUrl('https://api.example.com/api/v1/'));
  assert.throws(() => getApiBaseUrl('//attacker.example/api/v1'));
  assert.throws(() => getApiBaseUrl('https://user:pass@example.com/api/v1'));
  assert.throws(() => getApiBaseUrl('javascript:alert(1)'));
});

void test('shares one coordinator operation and retries only its first transport failure', async () => {
  const gate = deferred<void>();
  let calls = 0;
  const coordinator = createRefreshCoordinator(async () => {
    calls += 1;
    if (calls === 1) await gate.promise;
  });

  const first = coordinator.recover();
  const second = coordinator.recover();
  assert.equal(first, second);
  assert.equal(calls, 1);
  gate.resolve();
  await Promise.all([first, second]);

  let transportCalls = 0;
  const retrying = createRefreshCoordinator(async () => {
    transportCalls += 1;
    if (transportCalls === 1) throw new AdminHttpError('network', null, 'NETWORK_ERROR');
  });
  await retrying.recover();
  assert.equal(transportCalls, 2);

  let definitiveCalls = 0;
  const definitive = new AdminHttpError('http', 401, 'REFRESH_TOKEN_EXPIRED');
  await assert.rejects(
    createRefreshCoordinator(async () => {
      definitiveCalls += 1;
      throw definitive;
    }).recover(),
    (error: unknown) => error === definitive,
  );
  assert.equal(definitiveCalls, 1);
});

void test('single-flights concurrent expiry and replays every original request once', async () => {
  const credentials = createCsrfCredentialStore();
  credentials.set('session-csrf');
  const refreshGate = deferred<void>();
  const calls: InternalAxiosRequestConfig[] = [];
  let refreshCalls = 0;
  const adapter: AxiosAdapter = async (config) => {
    calls.push(config);
    if (config.url === '/auth/refresh') {
      refreshCalls += 1;
      await refreshGate.promise;
      return { data: undefined, status: 204, statusText: 'No Content', headers: {}, config };
    }
    if (config.authRecoveryAttempted !== true) {
      throwHttp(config, 401, 'ACCESS_TOKEN_EXPIRED');
    }
    return { data: { url: config.url }, status: 200, statusText: 'OK', headers: {}, config };
  };
  const client = createHttpClient({
    adapter,
    baseURL: 'https://api.example.com/api/v1',
    credentials,
  });
  const policy = { csrf: 'omit', failure: 'global', refresh: 'eligible' } as const;

  const requests = ['/one', '/two', '/three'].map((url) =>
    client.get<{ url: string }>(url, { authPolicy: policy }),
  );
  await waitFor(() => refreshCalls === 1);
  assert.equal(calls.filter((call) => call.url === '/auth/refresh').length, 1);
  refreshGate.resolve();

  const responses = await Promise.all(requests);
  assert.deepEqual(
    responses.map((response) => response.data.url),
    ['/one', '/two', '/three'],
  );
  assert.equal(refreshCalls, 1);
  assert.equal(calls.filter((call) => call.url !== '/auth/refresh').length, 6);
  assert.ok(
    calls
      .filter((call) => call.url !== '/auth/refresh' && call.authRecoveryAttempted)
      .every((call) => call.authRecoveryAttempted === true),
  );
  const refresh = calls.find((call) => call.url === '/auth/refresh');
  assert.equal(refresh?.data, undefined);
  assert.equal(refresh?.withCredentials, true);
  assert.equal(refresh?.headers.get('X-CSRF-Token'), 'session-csrf');
  assert.equal(refresh?.authPolicy?.refresh, 'never');
});

void test('excludes non-expiry, forbidden, non-eligible, refresh, and replayed failures', async () => {
  const credentials = createCsrfCredentialStore();
  credentials.set('session-csrf');
  let refreshCalls = 0;
  const adapter: AxiosAdapter = async (config) => {
    if (config.url === '/auth/refresh') refreshCalls += 1;
    const status = config.url === '/forbidden' ? 403 : 401;
    const code = config.url === '/other-401' ? 'INVALID_ACCESS_TOKEN' : 'ACCESS_TOKEN_EXPIRED';
    throwHttp(config, status, code);
  };
  const client = createHttpClient({
    adapter,
    baseURL: 'https://api.example.com/api/v1',
    credentials,
  });
  const eligible = { csrf: 'omit', failure: 'caller', refresh: 'eligible' } as const;
  const never = { csrf: 'omit', failure: 'caller', refresh: 'never' } as const;

  await assert.rejects(client.get('/other-401', { authPolicy: eligible }));
  await assert.rejects(client.get('/forbidden', { authPolicy: eligible }));
  await assert.rejects(client.get('/non-eligible', { authPolicy: never }));
  await assert.rejects(
    client.get('/already-replayed', { authPolicy: eligible, authRecoveryAttempted: true }),
  );
  await assert.rejects(
    client.post('/auth/refresh', undefined, {
      authPolicy: { csrf: 'required', failure: 'caller', refresh: 'never' },
      authRecoveryAttempted: true,
    }),
  );
  assert.equal(refreshCalls, 1);
});

void test('retries refresh transport once, then retains state and settles waiters consistently', async () => {
  const credentials = createCsrfCredentialStore();
  credentials.set('retained-csrf');
  const channel = createHttpFailureChannel();
  const published: AdminHttpError[] = [];
  channel.subscribe((failure) => published.push(failure));
  let refreshCalls = 0;
  const adapter: AxiosAdapter = async (config) => {
    if (config.url === '/auth/refresh') {
      refreshCalls += 1;
      throw new axios.AxiosError('network', 'ERR_NETWORK', config);
    }
    throwHttp(config, 401, 'ACCESS_TOKEN_EXPIRED');
  };
  const client = createHttpClient({
    adapter,
    baseURL: 'https://api.example.com/api/v1',
    credentials,
    failurePublisher: channel,
  });
  const policy = { csrf: 'omit', failure: 'global', refresh: 'eligible' } as const;

  const results = await Promise.allSettled([
    client.get('/one', { authPolicy: policy }),
    client.get('/two', { authPolicy: policy }),
    client.get('/three', { authPolicy: policy }),
  ]);
  assert.equal(refreshCalls, 2);
  assert.ok(results.every((result) => result.status === 'rejected'));
  const reasons = results.map((result) =>
    result.status === 'rejected' ? result.reason : undefined,
  );
  assert.ok(reasons.every((reason) => reason === reasons[0]));
  assert.equal(reasons[0]?.kind, 'network');
  assert.equal(credentials.get(), 'retained-csrf');
  assert.equal(published.length, 1);
  assert.equal(published[0], reasons[0]);
});

void test('does not retry definitive refresh rejection and keeps cancellation waiter-local', async () => {
  const credentials = createCsrfCredentialStore();
  credentials.set('session-csrf');
  const refreshGate = deferred<void>();
  let refreshCalls = 0;
  let replayCalls = 0;
  let definitive = false;
  const adapter: AxiosAdapter = async (config) => {
    if (config.url === '/auth/refresh') {
      refreshCalls += 1;
      await refreshGate.promise;
      if (definitive) throwHttp(config, 401, 'REFRESH_TOKEN_EXPIRED');
      return { data: undefined, status: 204, statusText: 'No Content', headers: {}, config };
    }
    if (config.authRecoveryAttempted) {
      replayCalls += 1;
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
    }
    throwHttp(config, 401, 'ACCESS_TOKEN_EXPIRED');
  };
  const client = createHttpClient({
    adapter,
    baseURL: 'https://api.example.com/api/v1',
    credentials,
  });
  const policy = { csrf: 'omit', failure: 'caller', refresh: 'eligible' } as const;
  const controller = new AbortController();
  const canceled = client.get('/cancel-me', { authPolicy: policy, signal: controller.signal });
  const succeeds = client.get('/continue', { authPolicy: policy });
  await waitFor(() => refreshCalls === 1);
  controller.abort();
  refreshGate.resolve();
  await assert.rejects(canceled, { kind: 'canceled', code: 'REQUEST_CANCELED' });
  await succeeds;
  assert.equal(replayCalls, 1);

  definitive = true;
  const rejected = await Promise.allSettled([
    client.get('/definitive-one', { authPolicy: policy }),
    client.get('/definitive-two', { authPolicy: policy }),
  ]);
  assert.equal(refreshCalls, 2);
  assert.ok(rejected.every((result) => result.status === 'rejected'));
  const reasons = rejected.map((result) =>
    result.status === 'rejected' ? result.reason : undefined,
  );
  assert.ok(reasons.every((reason) => reason === reasons[0]));
  assert.equal(reasons[0]?.code, 'REFRESH_TOKEN_EXPIRED');
});
