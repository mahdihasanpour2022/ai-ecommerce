import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { DEFAULT_API_PORT, parseEnvironment } from '../src/config/environment';

void describe('API environment parsing', () => {
  void test('uses safe local defaults when optional values are absent', () => {
    assert.deepEqual(parseEnvironment({}), {
      nodeEnv: 'development',
      port: DEFAULT_API_PORT,
    });
  });

  void test('parses every supported runtime environment and an explicit port', () => {
    for (const nodeEnv of ['development', 'test', 'production']) {
      assert.deepEqual(parseEnvironment({ NODE_ENV: nodeEnv, PORT: '4100' }), {
        nodeEnv,
        port: 4100,
      });
    }
  });

  for (const nodeEnv of ['', 'staging', 'PRODUCTION']) {
    void test(`rejects unsupported NODE_ENV input: ${nodeEnv || '<empty>'}`, () => {
      assert.throws(
        () => parseEnvironment({ NODE_ENV: nodeEnv }),
        /Invalid NODE_ENV: expected development, test, or production\./,
      );
    });
  }

  for (const port of ['', '0', '-1', '3000.5', ' 3000', '65536', 'not-a-port']) {
    void test(`rejects malformed or out-of-range PORT input: ${port || '<empty>'}`, () => {
      assert.throws(
        () => parseEnvironment({ PORT: port }),
        /Invalid PORT: expected a base-10 integer from 1 through 65535\./,
      );
    });
  }
});
