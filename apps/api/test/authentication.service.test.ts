import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { describe, test } from 'node:test';

import type { AuthenticationCrypto } from '../src/authentication/authentication.crypto';
import { AuthenticationCrypto as AuthenticationCryptoImplementation } from '../src/authentication/authentication.crypto';
import type { AuthenticationRepository } from '../src/authentication/authentication.repository';
import { AuthenticationService } from '../src/authentication/authentication.service';
import { createTestEnvironment } from './test-environment';

void describe('authentication orchestration failure boundaries', () => {
  void test('does not enter persistence when access-token signing fails', async () => {
    let commits = 0;
    const repository = {
      consumeAccountAttempt: () => Promise.resolve(null),
      findAdmin: () =>
        Promise.resolve({
          id: randomUUID(),
          passwordHash: '$argon2id$test-only',
          disabled: false,
          eligible: true,
        }),
      commitSuccessfulLogin: () => {
        commits += 1;
        return Promise.resolve();
      },
    } as unknown as AuthenticationRepository;
    const crypto = {
      identifierKey: () => Uint8Array.from(randomBytes(32)),
      verifyPassword: () => Promise.resolve(true),
      passwordNeedsRehash: () => false,
      issueLoginCredentials: () => Promise.reject(new Error('signing failed')),
    } as unknown as AuthenticationCrypto;
    const service = new AuthenticationService(repository, crypto);

    await assert.rejects(
      service.login({
        email: `signing-${randomUUID()}@example.invalid`,
        password: randomBytes(32).toString('base64url'),
      }),
      /signing failed/u,
    );
    assert.equal(commits, 0);
  });

  void test('uses the dummy-verification selector for an unknown identity', async () => {
    let selectedHash: string | null | undefined;
    const repository = {
      consumeAccountAttempt: () => Promise.resolve(null),
      findAdmin: () => Promise.resolve(null),
    } as unknown as AuthenticationRepository;
    const crypto = {
      identifierKey: () => Uint8Array.from(randomBytes(32)),
      verifyPassword: (hash: string | null) => {
        selectedHash = hash;
        return Promise.resolve(false);
      },
    } as unknown as AuthenticationCrypto;
    const service = new AuthenticationService(repository, crypto);

    await assert.rejects(
      service.login({
        email: `unknown-${randomUUID()}@example.invalid`,
        password: randomBytes(32).toString('base64url'),
      }),
      (error: unknown) =>
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'INVALID_CREDENTIALS',
    );
    assert.equal(selectedHash, null);
  });

  void test('creates unique 256-bit opaque credentials and hashes', async () => {
    const crypto = new AuthenticationCryptoImplementation(createTestEnvironment());
    const first = await crypto.issueLoginCredentials(randomUUID());
    const second = await crypto.issueLoginCredentials(randomUUID());

    assert.match(first.csrfToken, /^[A-Za-z0-9_-]{43}$/u);
    assert.match(first.refreshToken, /^[A-Za-z0-9_-]{43}$/u);
    assert.equal(first.csrfTokenHash.byteLength, 32);
    assert.equal(first.refreshTokenHash.byteLength, 32);
    assert.notEqual(first.csrfToken, second.csrfToken);
    assert.notEqual(first.refreshToken, second.refreshToken);
    assert.notDeepEqual(first.csrfTokenHash, second.csrfTokenHash);
    assert.notDeepEqual(first.refreshTokenHash, second.refreshTokenHash);
  });
});
