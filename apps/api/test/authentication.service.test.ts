import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { describe, test } from 'node:test';

import type { AuthenticationCrypto } from '../src/authentication/authentication.crypto';
import { AuthenticationCrypto as AuthenticationCryptoImplementation } from '../src/authentication/authentication.crypto';
import type { AuthenticationRepository } from '../src/authentication/authentication.repository';
import { AuthenticationService } from '../src/authentication/authentication.service';
import { ProtectedAuthenticationService } from '../src/authentication/protected-authentication.service';
import { ACCESS_COOKIE_NAME } from '../src/authentication/authentication.constants';
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

  void test('authenticates session-bound AES-256-GCM refresh recovery envelopes', async () => {
    const crypto = new AuthenticationCryptoImplementation(createTestEnvironment());
    const sessionId = randomUUID();
    const issued = await crypto.issueRefreshCredentials(
      randomUUID(),
      sessionId,
      new Date(Date.now() + 60_000),
    );

    assert.equal(issued.recovery.nonce.byteLength, 12);
    assert.equal(issued.recovery.authTag.byteLength, 16);
    assert.equal(
      crypto.decryptRefreshToken(sessionId, issued.tokenId, issued.recovery),
      issued.refreshToken,
    );
    const tamperedTag = Uint8Array.from(issued.recovery.authTag);
    tamperedTag[0] = (tamperedTag[0] ?? 0) ^ 1;
    assert.throws(
      () =>
        crypto.decryptRefreshToken(sessionId, issued.tokenId, {
          ...issued.recovery,
          authTag: tamperedTag,
        }),
      /authentication failed/u,
    );
    assert.throws(
      () => crypto.decryptRefreshToken(randomUUID(), issued.tokenId, issued.recovery),
      /authentication failed/u,
    );

    const rotatedCrypto = new AuthenticationCryptoImplementation(
      createTestEnvironment('test', {
        AUTH_REFRESH_RECOVERY_KEYRING: JSON.stringify({
          activeKid: 'new-recovery-key',
          keys: {
            'new-recovery-key': Buffer.alloc(32, 17).toString('base64'),
            'test-recovery-key': Buffer.alloc(32, 13).toString('base64'),
          },
        }),
      }),
    );
    assert.equal(
      rotatedCrypto.decryptRefreshToken(sessionId, issued.tokenId, issued.recovery),
      issued.refreshToken,
    );
  });

  void test('does not misclassify a protected-session database failure as an invalid token', async () => {
    const environment = createTestEnvironment();
    const crypto = new AuthenticationCryptoImplementation(environment);
    const credentials = await crypto.issueLoginCredentials(randomUUID());
    const databaseFailure = new Error('database unavailable');
    const repository = {
      findCurrentSession: () => Promise.reject(databaseFailure),
    } as unknown as AuthenticationRepository;
    const service = new ProtectedAuthenticationService(repository, crypto, environment);
    const request = {
      headers: { cookie: `${ACCESS_COOKIE_NAME}=${credentials.accessToken}` },
    } as IncomingMessage;

    await assert.rejects(service.authenticateAccess(request), databaseFailure);
  });
});
