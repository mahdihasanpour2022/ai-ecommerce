import { Inject, Injectable } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { errors as joseErrors, jwtVerify, type JWTPayload, type JWSHeaderParameters } from 'jose';

import type { ApiEnvironment } from '../config/environment.js';
import { API_ENVIRONMENT } from '../config/tokens.js';
import {
  ACCESS_COOKIE_NAME,
  ACCOUNT_DISABLED_MESSAGE,
  AUTHENTICATION_REQUIRED_MESSAGE,
  INSUFFICIENT_PERMISSION_MESSAGE,
  INVALID_ACCESS_TOKEN_MESSAGE,
  REFRESH_COOKIE_NAME,
  REFRESH_TOKEN_EXPIRED_MESSAGE,
  REFRESH_TOKEN_INVALID_MESSAGE,
} from './authentication.constants.js';
import type { CurrentAuthentication } from './authentication-context.js';
import { AuthenticationCrypto } from './authentication.crypto.js';
import { AuthenticationError } from './authentication.errors.js';
import {
  AuthenticationRepository,
  type CurrentSessionRecord,
} from './authentication.repository.js';
import { readCookie } from './cookie.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const ACCESS_CLAIMS = ['aud', 'exp', 'iat', 'iss', 'jti', 'sid', 'sub'] as const;
const ACCESS_HEADERS = ['alg', 'kid', 'typ'] as const;

@Injectable()
export class ProtectedAuthenticationService {
  constructor(
    private readonly repository: AuthenticationRepository,
    private readonly crypto: AuthenticationCrypto,
    @Inject(API_ENVIRONMENT) private readonly environment: ApiEnvironment,
  ) {}

  async authenticateAccess(
    request: IncomingMessage,
    now = new Date(),
  ): Promise<CurrentAuthentication> {
    const cookie = readCookie(request, ACCESS_COOKIE_NAME);
    if (cookie.kind === 'missing') {
      throw new AuthenticationError(
        401,
        'AUTHENTICATION_REQUIRED',
        AUTHENTICATION_REQUIRED_MESSAGE,
      );
    }
    if (cookie.kind === 'invalid') this.invalidAccess();

    let payload: JWTPayload;
    let protectedHeader: JWSHeaderParameters;
    try {
      const verification = await jwtVerify(
        cookie.value,
        (header) => {
          if (!this.hasExactKeys(header, ACCESS_HEADERS)) this.invalidAccess();
          if (header.alg !== 'EdDSA' || header.typ !== 'at+jwt' || typeof header.kid !== 'string') {
            this.invalidAccess();
          }
          const key = this.environment.authentication.jwtPublicKeys.get(header.kid);
          if (key === undefined) this.invalidAccess();
          return key;
        },
        {
          algorithms: ['EdDSA'],
          typ: 'at+jwt',
          issuer: this.environment.authentication.jwtIssuer,
          audience: this.environment.authentication.jwtAudience,
          requiredClaims: ['sub', 'sid', 'jti', 'iat', 'exp'],
          currentDate: now,
        },
      );
      payload = verification.payload;
      protectedHeader = verification.protectedHeader;
    } catch (error) {
      if (error instanceof AuthenticationError) throw error;
      if (error instanceof joseErrors.JWTExpired) {
        throw new AuthenticationError(401, 'ACCESS_TOKEN_EXPIRED', '');
      }
      this.invalidAccess();
    }
    if (!this.hasExactKeys(payload, ACCESS_CLAIMS)) this.invalidAccess();
    const nowSeconds = Math.floor(now.getTime() / 1000);
    if (
      typeof payload.sub !== 'string' ||
      !UUID_PATTERN.test(payload.sub) ||
      typeof payload.sid !== 'string' ||
      !UUID_PATTERN.test(payload.sid) ||
      typeof payload.jti !== 'string' ||
      !UUID_PATTERN.test(payload.jti) ||
      typeof payload.iat !== 'number' ||
      !Number.isInteger(payload.iat) ||
      payload.iat > nowSeconds ||
      typeof payload.exp !== 'number' ||
      !Number.isInteger(payload.exp) ||
      payload.exp - payload.iat !== this.environment.authentication.accessTokenTtlSeconds ||
      payload.iss !== this.environment.authentication.jwtIssuer ||
      payload.aud !== this.environment.authentication.jwtAudience ||
      protectedHeader.kid === undefined
    ) {
      this.invalidAccess();
    }
    const session = await this.repository.findCurrentSession(payload.sid);
    if (session === null || session.adminUserId !== payload.sub) this.invalidAccess();
    return this.toCurrentAuthentication(session, now);
  }

  async bootstrapCsrf(request: IncomingMessage, now = new Date()): Promise<string> {
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
    const token = await this.repository.findRefreshCredential(
      this.crypto.hashOpaqueCredential(cookie.value),
    );
    if (token === null || token.rotatedAt !== null || token.revokedAt !== null) {
      this.invalidRefresh();
    }
    if (token.expiresAt <= now || token.session.expiresAt <= now) {
      throw new AuthenticationError(401, 'REFRESH_TOKEN_EXPIRED', REFRESH_TOKEN_EXPIRED_MESSAGE);
    }
    const authentication = this.toCurrentAuthentication(token.session, now);
    const csrfToken = this.crypto.recoverCsrfToken(
      authentication.sessionId,
      authentication.csrfTokenHash,
    );
    if (csrfToken === null) throw new Error('Session CSRF key is unavailable.');
    return csrfToken;
  }

  validateCurrentSession(session: CurrentSessionRecord, now = new Date()): CurrentAuthentication {
    return this.toCurrentAuthentication(session, now);
  }

  private toCurrentAuthentication(session: CurrentSessionRecord, now: Date): CurrentAuthentication {
    if (session.revokedAt !== null || session.expiresAt <= now) {
      throw new AuthenticationError(
        401,
        'AUTHENTICATION_REQUIRED',
        AUTHENTICATION_REQUIRED_MESSAGE,
      );
    }
    if (session.adminUser.disabledAt !== null) {
      throw new AuthenticationError(401, 'ACCOUNT_DISABLED', ACCOUNT_DISABLED_MESSAGE);
    }
    const roles = [...new Set(session.adminUser.roles.map(({ role }) => role.code))].sort();
    const permissions = [
      ...new Set(
        session.adminUser.roles.flatMap(({ role }) =>
          role.permissions.map(({ permission }) => permission.code),
        ),
      ),
    ].sort();
    if (!permissions.includes('admin.access')) {
      throw new AuthenticationError(
        403,
        'INSUFFICIENT_PERMISSION',
        INSUFFICIENT_PERMISSION_MESSAGE,
      );
    }
    return {
      sessionId: session.id,
      csrfTokenHash: Uint8Array.from(session.csrfTokenHash),
      admin: {
        id: session.adminUser.id,
        email: session.adminUser.email,
        displayName: session.adminUser.displayName,
      },
      roles,
      permissions,
    };
  }

  private hasExactKeys(value: object, expected: readonly string[]): boolean {
    const keys = Object.keys(value).sort();
    return keys.length === expected.length && keys.every((key, index) => key === expected[index]);
  }

  private invalidAccess(): never {
    throw new AuthenticationError(401, 'INVALID_ACCESS_TOKEN', INVALID_ACCESS_TOKEN_MESSAGE);
  }

  private invalidRefresh(): never {
    throw new AuthenticationError(401, 'REFRESH_TOKEN_INVALID', REFRESH_TOKEN_INVALID_MESSAGE);
  }
}
