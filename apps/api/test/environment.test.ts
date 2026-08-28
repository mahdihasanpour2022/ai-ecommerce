import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { DEFAULT_API_PORT, parseEnvironment } from '../src/config/environment';
import { validEnvironmentSource } from './test-environment';

void describe('API environment parsing', () => {
  void test('uses safe local defaults when optional values are absent', () => {
    const environment = parseEnvironment(validEnvironmentSource({ NODE_ENV: undefined }));
    assert.equal(environment.nodeEnv, 'development');
    assert.equal(environment.port, DEFAULT_API_PORT);
    assert.equal(environment.authentication.refreshReuseGraceSeconds, 10);
    assert.equal(environment.authentication.refreshSessionLimitPerMinute, 10);
    assert.equal(environment.authentication.refreshIpLimitPerMinute, 30);
  });

  void test('parses every supported runtime environment and an explicit port', () => {
    for (const nodeEnv of ['development', 'test', 'production']) {
      const environment = parseEnvironment(
        validEnvironmentSource({ NODE_ENV: nodeEnv, PORT: '4100' }),
      );
      assert.equal(environment.nodeEnv, nodeEnv);
      assert.equal(environment.port, 4100);
    }
  });

  for (const nodeEnv of ['', 'staging', 'PRODUCTION']) {
    void test(`rejects unsupported NODE_ENV input: ${nodeEnv || '<empty>'}`, () => {
      assert.throws(
        () => parseEnvironment(validEnvironmentSource({ NODE_ENV: nodeEnv })),
        /Invalid NODE_ENV: expected development, test, or production\./,
      );
    });
  }

  for (const port of ['', '0', '-1', '3000.5', ' 3000', '65536', 'not-a-port']) {
    void test(`rejects malformed or out-of-range PORT input: ${port || '<empty>'}`, () => {
      assert.throws(
        () => parseEnvironment(validEnvironmentSource({ PORT: port })),
        /Invalid PORT:/,
      );
    });
  }

  void test('rejects missing and mismatched authentication secrets without echoing values', () => {
    assert.throws(
      () => parseEnvironment(validEnvironmentSource({ AUTH_JWT_PRIVATE_KEY: undefined })),
      /^Error: Invalid AUTH_JWT_PRIVATE_KEY:/,
    );
    assert.throws(
      () => parseEnvironment(validEnvironmentSource({ CORS_ALLOWED_ORIGINS: '*' })),
      /^Error: Invalid CORS_ALLOWED_ORIGINS:/,
    );
    assert.throws(
      () => parseEnvironment(validEnvironmentSource({ AUTH_LOGIN_THROTTLE_HMAC_KEY: 'short' })),
      /^Error: Invalid AUTH_LOGIN_THROTTLE_HMAC_KEY:/,
    );
    assert.throws(
      () => parseEnvironment(validEnvironmentSource({ AUTH_JWT_ACTIVE_KID: 'untrusted-key-id' })),
      /^Error: Invalid AUTH_JWT_ACTIVE_KID:/,
    );
    assert.throws(
      () => parseEnvironment(validEnvironmentSource({ AUTH_CSRF_HMAC_KEYS: undefined })),
      /^Error: Invalid AUTH_CSRF_HMAC_KEYS:/,
    );
    assert.throws(
      () => parseEnvironment(validEnvironmentSource({ AUTH_CSRF_ACTIVE_KID: 'retired' })),
      /^Error: Invalid AUTH_CSRF_ACTIVE_KID:/,
    );
    assert.throws(
      () => parseEnvironment(validEnvironmentSource({ AUTH_REFRESH_RECOVERY_KEYRING: undefined })),
      /^Error: Invalid AUTH_REFRESH_RECOVERY_KEYRING:/,
    );
    assert.throws(
      () =>
        parseEnvironment(
          validEnvironmentSource({
            AUTH_REFRESH_RECOVERY_KEYRING: JSON.stringify({
              activeKid: 'missing',
              keys: { available: Buffer.alloc(32, 19).toString('base64') },
            }),
          }),
        ),
      /^Error: Invalid AUTH_REFRESH_RECOVERY_KEYRING:/,
    );
    const sharedKey = Buffer.alloc(32, 7).toString('base64');
    assert.throws(
      () =>
        parseEnvironment(
          validEnvironmentSource({
            AUTH_CSRF_HMAC_KEYS: JSON.stringify({ shared: sharedKey }),
            AUTH_CSRF_ACTIVE_KID: 'shared',
          }),
        ),
      /^Error: Invalid AUTH_CSRF_HMAC_KEYS:/,
    );
    assert.throws(
      () =>
        parseEnvironment(
          validEnvironmentSource({
            AUTH_REFRESH_RECOVERY_KEYRING: JSON.stringify({
              activeKid: 'shared',
              keys: { shared: sharedKey },
            }),
          }),
        ),
      /^Error: Invalid AUTH_REFRESH_RECOVERY_KEYRING:/,
    );
  });
});
