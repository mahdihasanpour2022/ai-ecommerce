import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { describe, test } from 'node:test';

import { AuthenticationCrypto } from '../src/authentication/authentication.crypto';
import { CsrfService } from '../src/authentication/csrf.service';
import { LoginSecurity } from '../src/authentication/login-security';
import { createTestEnvironment } from './test-environment';

function request(
  method: string,
  csrfToken: string | undefined,
  origin = 'http://localhost:3001',
): IncomingMessage {
  return {
    method,
    headers: {
      origin,
      'sec-fetch-site': 'same-origin',
      ...(csrfToken === undefined ? {} : { 'x-csrf-token': csrfToken }),
    },
  } as IncomingMessage;
}

void describe('session-bound CSRF validation', () => {
  void test('requires exact Origin and a timing-safe matching token on unsafe methods', async () => {
    const environment = createTestEnvironment();
    const crypto = new AuthenticationCrypto(environment);
    const service = new CsrfService(crypto, new LoginSecurity(environment));
    const credentials = await crypto.issueLoginCredentials(randomUUID());

    assert.doesNotThrow(() =>
      service.assertUnsafeRequest(
        request('POST', credentials.csrfToken),
        credentials.csrfTokenHash,
      ),
    );
    for (const candidate of [
      request('POST', undefined),
      request('POST', `${credentials.csrfToken.slice(0, -1)}x`),
      request('POST', credentials.csrfToken, 'https://attacker.example'),
    ]) {
      assert.throws(
        () => service.assertUnsafeRequest(candidate, credentials.csrfTokenHash),
        (error: unknown) =>
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === 'CSRF_VALIDATION_FAILED',
      );
    }
    assert.doesNotThrow(() =>
      service.assertUnsafeRequest(request('GET', undefined), credentials.csrfTokenHash),
    );
  });
});
