import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';
import { SignJWT } from 'jose';

import type { ApiEnvironment } from '../config/environment.js';
import { API_ENVIRONMENT } from '../config/tokens.js';
import {
  CUSTOMER_ACCESS_AUDIENCE,
  CUSTOMER_ACCESS_LIFETIME_SECONDS,
  CUSTOMER_SESSION_LIFETIME_SECONDS,
} from './customer-authentication.constants.js';

export interface IssuedCustomerSession {
  readonly sessionId: string;
  readonly csrfToken: string;
  readonly csrfTokenHash: Uint8Array<ArrayBuffer>;
  readonly refreshToken: string;
  readonly refreshTokenHash: Uint8Array<ArrayBuffer>;
  readonly accessToken: string;
  readonly accessExpiresAt: Date;
  readonly sessionExpiresAt: Date;
}

@Injectable()
export class CustomerSessionCrypto {
  constructor(@Inject(API_ENVIRONMENT) private readonly environment: ApiEnvironment) {}

  // اعتبارنامه‌های مشتری را با نوع، audience و شناسه‌های مستقل از نشست ادمین صادر می‌کند.
  async issue(customerId: string, now: Date): Promise<IssuedCustomerSession> {
    const sessionId = randomUUID();
    const csrfToken = randomBytes(32).toString('base64url');
    const refreshToken = randomBytes(32).toString('base64url');
    const accessExpiresAt = new Date(now.getTime() + CUSTOMER_ACCESS_LIFETIME_SECONDS * 1000);
    const sessionExpiresAt = new Date(now.getTime() + CUSTOMER_SESSION_LIFETIME_SECONDS * 1000);
    const accessToken = await new SignJWT({ sid: sessionId })
      .setProtectedHeader({
        alg: 'EdDSA',
        typ: 'customer-at+jwt',
        kid: this.environment.authentication.jwtActiveKid,
      })
      .setSubject(customerId)
      .setIssuer(this.environment.authentication.jwtIssuer)
      .setAudience(CUSTOMER_ACCESS_AUDIENCE)
      .setJti(randomUUID())
      .setIssuedAt(Math.floor(now.getTime() / 1000))
      .setExpirationTime(Math.floor(accessExpiresAt.getTime() / 1000))
      .sign(this.environment.authentication.jwtPrivateKey);
    return {
      sessionId,
      csrfToken,
      csrfTokenHash: this.sha256(csrfToken),
      refreshToken,
      refreshTokenHash: this.sha256(refreshToken),
      accessToken,
      accessExpiresAt,
      sessionExpiresAt,
    };
  }

  private sha256(value: string): Uint8Array<ArrayBuffer> {
    return Uint8Array.from(createHash('sha256').update(value, 'utf8').digest());
  }
}
