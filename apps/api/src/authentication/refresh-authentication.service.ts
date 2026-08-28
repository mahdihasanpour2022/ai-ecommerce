import { Injectable, Logger } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';

import {
  ACCOUNT_DISABLED_MESSAGE,
  AUTHENTICATION_REQUIRED_MESSAGE,
  CSRF_VALIDATION_FAILED_MESSAGE,
  RATE_LIMITED_MESSAGE,
  REFRESH_COOKIE_NAME,
  REFRESH_TOKEN_EXPIRED_MESSAGE,
  REFRESH_TOKEN_INVALID_MESSAGE,
  REFRESH_TOKEN_REUSED_MESSAGE,
  INSUFFICIENT_PERMISSION_MESSAGE,
} from './authentication.constants.js';
import { AuthenticationCrypto } from './authentication.crypto.js';
import { AuthenticationError } from './authentication.errors.js';
import { AuthenticationRepository } from './authentication.repository.js';
import { readCookie } from './cookie.js';
import { CsrfService } from './csrf.service.js';
import { LoginSecurity } from './login-security.js';
import { ProtectedAuthenticationService } from './protected-authentication.service.js';

export interface RefreshResult {
  readonly accessToken: string;
  readonly accessExpiresAt: Date;
  readonly refreshToken: string;
  readonly sessionExpiresAt: Date;
}

@Injectable()
export class RefreshAuthenticationService {
  private readonly logger = new Logger(RefreshAuthenticationService.name);

  constructor(
    private readonly repository: AuthenticationRepository,
    private readonly crypto: AuthenticationCrypto,
    private readonly currentAuthentication: ProtectedAuthenticationService,
    private readonly csrf: CsrfService,
    private readonly security: LoginSecurity,
  ) {}

  async refresh(request: IncomingMessage, now = new Date()): Promise<RefreshResult> {
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
    if (token === null || token.revokedAt !== null) this.invalidRefresh();
    if (token.expiresAt <= now || token.session.expiresAt <= now) {
      throw new AuthenticationError(401, 'REFRESH_TOKEN_EXPIRED', REFRESH_TOKEN_EXPIRED_MESSAGE);
    }
    const authentication = this.currentAuthentication.validateCurrentSession(token.session, now);
    this.csrf.assertUnsafeRequest(request, authentication.csrfTokenHash);
    this.security.consumeRefreshIpAttempt(request, now.getTime());

    const candidate = await this.crypto.issueRefreshCredentials(
      authentication.admin.id,
      authentication.sessionId,
      token.session.expiresAt,
      now,
    );
    const decision = await this.repository.rotateOrRecoverRefresh(
      tokenHash,
      authentication.sessionId,
      authentication.admin.id,
      candidate,
      now,
    );
    switch (decision.kind) {
      case 'rotated':
        return {
          accessToken: candidate.accessToken,
          accessExpiresAt: candidate.accessExpiresAt,
          refreshToken: candidate.refreshToken,
          sessionExpiresAt: token.session.expiresAt,
        };
      case 'recovered': {
        let refreshToken: string;
        try {
          refreshToken = this.crypto.decryptRefreshToken(
            authentication.sessionId,
            decision.tokenId,
            decision.envelope,
          );
          if (!this.crypto.verifyOpaqueCredential(refreshToken, decision.tokenHash)) {
            throw new Error('Recovered credential does not match the current token.');
          }
        } catch {
          await this.repository.revokeSessionForRefreshReuse(authentication.sessionId, now);
          this.logReuse(authentication.sessionId);
          this.reusedRefresh();
        }
        this.logger.log({
          event: 'authentication.refresh.recovered',
          sessionId: authentication.sessionId,
        });
        return {
          accessToken: candidate.accessToken,
          accessExpiresAt: candidate.accessExpiresAt,
          refreshToken,
          sessionExpiresAt: token.session.expiresAt,
        };
      }
      case 'reused':
        this.logReuse(decision.sessionId);
        return this.reusedRefresh();
      case 'expired':
        throw new AuthenticationError(401, 'REFRESH_TOKEN_EXPIRED', REFRESH_TOKEN_EXPIRED_MESSAGE);
      case 'authentication_required':
        throw new AuthenticationError(
          401,
          'AUTHENTICATION_REQUIRED',
          AUTHENTICATION_REQUIRED_MESSAGE,
        );
      case 'account_disabled':
        throw new AuthenticationError(401, 'ACCOUNT_DISABLED', ACCOUNT_DISABLED_MESSAGE);
      case 'insufficient_permission':
        throw new AuthenticationError(
          403,
          'INSUFFICIENT_PERMISSION',
          INSUFFICIENT_PERMISSION_MESSAGE,
        );
      case 'throttled':
        throw new AuthenticationError(
          429,
          'AUTH_RATE_LIMITED',
          RATE_LIMITED_MESSAGE,
          decision.retryAfterSeconds,
        );
      case 'invalid':
        return this.invalidRefresh();
    }
  }

  private invalidRefresh(): never {
    throw new AuthenticationError(401, 'REFRESH_TOKEN_INVALID', REFRESH_TOKEN_INVALID_MESSAGE);
  }

  private reusedRefresh(): never {
    throw new AuthenticationError(401, 'REFRESH_TOKEN_REUSED', REFRESH_TOKEN_REUSED_MESSAGE);
  }

  private logReuse(sessionId: string): void {
    this.logger.warn({ event: 'authentication.refresh.reused', sessionId });
  }
}
