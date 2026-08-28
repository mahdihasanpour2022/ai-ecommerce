import { Injectable } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';

import { CSRF_VALIDATION_FAILED_MESSAGE } from './authentication.constants.js';
import { AuthenticationCrypto } from './authentication.crypto.js';
import { AuthenticationError } from './authentication.errors.js';
import { LoginSecurity } from './login-security.js';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class CsrfService {
  constructor(
    private readonly crypto: AuthenticationCrypto,
    private readonly requestSecurity: LoginSecurity,
  ) {}

  assertUnsafeRequest(request: IncomingMessage, storedHash: Uint8Array<ArrayBufferLike>): void {
    if (!UNSAFE_METHODS.has(request.method ?? '')) return;
    try {
      this.requestSecurity.assertRequestBoundary(request);
    } catch {
      this.invalidCsrf();
    }
    const header = request.headers['x-csrf-token'];
    if (typeof header !== 'string' || !this.crypto.verifyCsrfToken(header, storedHash)) {
      this.invalidCsrf();
    }
  }

  private invalidCsrf(): never {
    throw new AuthenticationError(403, 'CSRF_VALIDATION_FAILED', CSRF_VALIDATION_FAILED_MESSAGE);
  }
}
