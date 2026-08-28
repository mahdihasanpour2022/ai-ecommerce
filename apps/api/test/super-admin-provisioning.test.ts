import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { describe, test } from 'node:test';

import * as argon2 from 'argon2';

import { runCreateSuperAdminCli } from '../src/administration/create-super-admin.js';
import {
  ARGON2_OPTIONS,
  hashAdminPassword,
  parseSuperAdminInput,
  ProvisioningError,
} from '../src/administration/super-admin-provisioning.js';

function createPassword(): string {
  return randomBytes(32).toString('base64url');
}

function validEnvironmentInput(password = createPassword()) {
  return {
    ADMIN_BOOTSTRAP_EMAIL: '  First.Admin@Example.Invalid  ',
    ADMIN_BOOTSTRAP_DISPLAY_NAME: '  First Admin  ',
    ADMIN_BOOTSTRAP_PASSWORD: password,
    ADMIN_BOOTSTRAP_PASSWORD_CONFIRM: password,
  };
}

void describe('first Super Admin provisioning input and hashing', () => {
  void test('canonicalizes identity input without altering the password', () => {
    const environment = validEnvironmentInput();
    const result = parseSuperAdminInput(environment);

    assert.equal(result.email, 'first.admin@example.invalid');
    assert.equal(result.displayName, 'First Admin');
    assert.equal(result.password, environment.ADMIN_BOOTSTRAP_PASSWORD);
  });

  const invalidInputs = [
    ['missing email', { ADMIN_BOOTSTRAP_EMAIL: undefined }],
    ['malformed email', { ADMIN_BOOTSTRAP_EMAIL: 'not-an-email' }],
    ['empty display name', { ADMIN_BOOTSTRAP_DISPLAY_NAME: '   ' }],
    ['short password', { ADMIN_BOOTSTRAP_PASSWORD: 'x'.repeat(14) }],
    ['long password', { ADMIN_BOOTSTRAP_PASSWORD: 'x'.repeat(129) }],
    ['mismatched confirmation', { ADMIN_BOOTSTRAP_PASSWORD_CONFIRM: createPassword() }],
  ] as const;

  for (const [label, override] of invalidInputs) {
    void test(`rejects ${label}`, () => {
      const input = { ...validEnvironmentInput(), ...override };
      if ('ADMIN_BOOTSTRAP_PASSWORD' in override) {
        input.ADMIN_BOOTSTRAP_PASSWORD_CONFIRM = input.ADMIN_BOOTSTRAP_PASSWORD;
      }

      assert.throws(
        () => parseSuperAdminInput(input),
        (error: unknown) => error instanceof ProvisioningError && error.code === 'INVALID_INPUT',
      );
    });
  }

  void test('creates unique verifiable Argon2id v19 hashes with approved parameters', async () => {
    const password = createPassword();
    const [firstHash, secondHash] = await Promise.all([
      hashAdminPassword(password),
      hashAdminPassword(password),
    ]);

    assert.notEqual(firstHash, secondHash);
    const [empty, algorithm, version, parameters] = firstHash.split('$');
    assert.equal(empty, '');
    assert.equal(algorithm, 'argon2id');
    assert.equal(version, 'v=19');
    assert.deepEqual(parameters?.split(',').sort(), ['m=65536', 'p=1', 't=3']);
    assert.equal(await argon2.verify(firstHash, password), true);
    assert.equal(argon2.needsRehash(firstHash, ARGON2_OPTIONS), false);
  });
});

void describe('first Super Admin CLI boundary', () => {
  void test('consumes password variables and emits only a fixed success message', async () => {
    const password = createPassword();
    const environment: NodeJS.ProcessEnv = {
      DATABASE_URL: 'postgresql://local-user@localhost:5432/local-test',
      ...validEnvironmentInput(password),
    };
    const stdout: string[] = [];
    const stderr: string[] = [];
    let provisioned = false;

    const exitCode = await runCreateSuperAdminCli({
      argv: [],
      environment,
      io: { stdout: (message) => stdout.push(message), stderr: (message) => stderr.push(message) },
      provision: (_databaseUrl, input) => {
        assert.equal(input.password, password);
        provisioned = true;
        return Promise.resolve();
      },
    });

    assert.equal(exitCode, 0);
    assert.equal(provisioned, true);
    assert.deepEqual(stdout, ['First Super Admin provisioned successfully.']);
    assert.deepEqual(stderr, []);
    assert.equal(environment.ADMIN_BOOTSTRAP_PASSWORD, undefined);
    assert.equal(environment.ADMIN_BOOTSTRAP_PASSWORD_CONFIRM, undefined);
    assert.doesNotMatch(`${stdout.join(' ')} ${stderr.join(' ')}`, new RegExp(password, 'u'));
  });

  void test('rejects command arguments and still consumes password variables', async () => {
    const environment: NodeJS.ProcessEnv = {
      DATABASE_URL: 'postgresql://local-user@localhost:5432/local-test',
      ...validEnvironmentInput(),
    };
    const stderr: string[] = [];

    const exitCode = await runCreateSuperAdminCli({
      argv: ['--password'],
      environment,
      io: { stdout: () => undefined, stderr: (message) => stderr.push(message) },
      provision: () =>
        Promise.reject(new Error('Provisioning must not run for command arguments.')),
    });

    assert.equal(exitCode, 1);
    assert.deepEqual(stderr, ['Provisioning failed: required input is invalid.']);
    assert.equal(environment.ADMIN_BOOTSTRAP_PASSWORD, undefined);
    assert.equal(environment.ADMIN_BOOTSTRAP_PASSWORD_CONFIRM, undefined);
  });

  void test('maps database failures to a safe fixed message', async () => {
    const environment: NodeJS.ProcessEnv = {
      DATABASE_URL: 'postgresql://local-user@localhost:5432/local-test',
      ...validEnvironmentInput(),
    };
    const stderr: string[] = [];

    const exitCode = await runCreateSuperAdminCli({
      argv: [],
      environment,
      io: { stdout: () => undefined, stderr: (message) => stderr.push(message) },
      provision: () => Promise.reject(new Error('sensitive driver detail')),
    });

    assert.equal(exitCode, 1);
    assert.deepEqual(stderr, ['Provisioning failed: database operation failed.']);
    assert.doesNotMatch(stderr.join(' '), /sensitive|driver/iu);
  });
});
