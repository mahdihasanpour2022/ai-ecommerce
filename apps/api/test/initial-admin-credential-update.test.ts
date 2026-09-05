import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  CredentialUpdateError,
  parseInitialCredentialUpdateInput,
  type InitialCredentialUpdateEnvironmentInput,
} from '../src/administration/initial-admin-credential-update.js';
import { runUpdateInitialAdminCredentialsCli } from '../src/administration/update-initial-admin-credentials.js';

function validEnvironment(): NodeJS.ProcessEnv & InitialCredentialUpdateEnvironmentInput {
  return {
    DATABASE_URL: 'postgresql://local-user@localhost:5432/local-test',
    ADMIN_CREDENTIAL_USERNAME: '  Admin_User  ',
    ADMIN_CREDENTIAL_PASSWORD: '654321',
    ADMIN_CREDENTIAL_PASSWORD_CONFIRM: '654321',
  };
}

void describe('initial Admin credential update input', () => {
  void test('canonicalizes username and preserves the exact six-digit password', () => {
    assert.deepEqual(parseInitialCredentialUpdateInput(validEnvironment()), {
      username: 'admin_user',
      password: '654321',
    });
  });

  for (const [label, override] of [
    ['short username', { ADMIN_CREDENTIAL_USERNAME: 'ab' }],
    ['long username', { ADMIN_CREDENTIAL_USERNAME: 'a'.repeat(21) }],
    ['invalid username', { ADMIN_CREDENTIAL_USERNAME: 'admin-user' }],
    ['short password', { ADMIN_CREDENTIAL_PASSWORD: '12345' }],
    ['long password', { ADMIN_CREDENTIAL_PASSWORD: '1234567' }],
    ['localized digits', { ADMIN_CREDENTIAL_PASSWORD: '۱۲۳۴۵۶' }],
    ['mismatched password', { ADMIN_CREDENTIAL_PASSWORD_CONFIRM: '456789' }],
  ] as const) {
    void test(`rejects ${label}`, () => {
      const environment: InitialCredentialUpdateEnvironmentInput = {
        ...validEnvironment(),
        ...override,
      };
      assert.throws(
        () => parseInitialCredentialUpdateInput(environment),
        (error: unknown) =>
          error instanceof CredentialUpdateError && error.code === 'INVALID_INPUT',
      );
    });
  }
});

void describe('initial Admin credential update CLI boundary', () => {
  void test('consumes password variables and emits only a fixed success message', async () => {
    const environment = validEnvironment();
    const stdout: string[] = [];
    const stderr: string[] = [];
    let updated = false;

    const exitCode = await runUpdateInitialAdminCredentialsCli({
      argv: [],
      environment,
      io: { stdout: (message) => stdout.push(message), stderr: (message) => stderr.push(message) },
      update: (_databaseUrl, input) => {
        assert.deepEqual(input, { username: 'admin_user', password: '654321' });
        updated = true;
        return Promise.resolve();
      },
    });

    assert.equal(exitCode, 0);
    assert.equal(updated, true);
    assert.deepEqual(stdout, ['Initial Admin credentials updated successfully.']);
    assert.deepEqual(stderr, []);
    assert.equal(environment.ADMIN_CREDENTIAL_PASSWORD, undefined);
    assert.equal(environment.ADMIN_CREDENTIAL_PASSWORD_CONFIRM, undefined);
    assert.doesNotMatch(`${stdout.join(' ')} ${stderr.join(' ')}`, /654321/u);
  });

  void test('rejects arguments before database work and returns a fixed safe failure', async () => {
    const environment = validEnvironment();
    const stderr: string[] = [];
    const exitCode = await runUpdateInitialAdminCredentialsCli({
      argv: ['--password'],
      environment,
      io: { stdout: () => undefined, stderr: (message) => stderr.push(message) },
      update: () => Promise.reject(new Error('must not run')),
    });

    assert.equal(exitCode, 1);
    assert.deepEqual(stderr, ['Credential update failed: required input is invalid.']);
    assert.equal(environment.ADMIN_CREDENTIAL_PASSWORD, undefined);
    assert.equal(environment.ADMIN_CREDENTIAL_PASSWORD_CONFIRM, undefined);
  });
});
