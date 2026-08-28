import { Injectable, Logger } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';

import {
  AUTHENTICATION_REQUIRED_MESSAGE,
  CSRF_VALIDATION_FAILED_MESSAGE,
  REFRESH_COOKIE_NAME,
  REFRESH_TOKEN_INVALID_MESSAGE,
} from './authentication.constants.js';
import { AuthenticationCrypto } from './authentication.crypto.js';
import { AuthenticationError } from './authentication.errors.js';
import { AuthenticationRepository } from './authentication.repository.js';
import { readCookie } from './cookie.js';
import { CsrfService } from './csrf.service.js';
import { LoginSecurity } from './login-security.js';

@Injectable()
export class LogoutAuthenticationService {
  private readonly logger = new Logger(LogoutAuthenticationService.name);

  constructor(
    private readonly repository: AuthenticationRepository,
    private readonly crypto: AuthenticationCrypto,
    private readonly csrf: CsrfService,
    private readonly security: LoginSecurity,
  ) {}

  async logout(request: IncomingMessage, now = new Date()): Promise<void> {
    try {
      this.security.assertRequestBoundary(request);
    } catch {
      throw new AuthenticationError(403, 'CSRF_VALIDATION_FAILED', CSRF_VALIDATION_FAILED_MESSAGE);
    }
    const cookie = readCookie(request, REFRESH_COOKIE_NAME);
    if (cookie.kind === 'missing') {
      throw new AuthenticationError(
        401,
        'AUTHENTICATION_REQUIRED',
        AUTHENTICATION_REQUIRED_MESSAGE,
      );
    }
    if (cookie.kind === 'invalid' || !/^[A-Za-z0-9_-]{43}$/u.test(cookie.value)) {
      this.invalidRefresh();
    }
    const tokenHash = this.crypto.hashOpaqueCredential(cookie.value);
    const token = await this.repository.findRefreshCredential(tokenHash);
    if (token === null) this.invalidRefresh();
    this.csrf.assertUnsafeRequest(request, token.session.csrfTokenHash);
    const revoked = await this.repository.logoutKnownSession(tokenHash, token.sessionId, now);
    if (!revoked) this.invalidRefresh();
    this.logger.log({ event: 'authentication.session.logged_out', sessionId: token.sessionId });
  }

  private invalidRefresh(): never {
    throw new AuthenticationError(401, 'REFRESH_TOKEN_INVALID', REFRESH_TOKEN_INVALID_MESSAGE);
  }
}
