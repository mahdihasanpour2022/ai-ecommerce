import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';

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

export interface CustomerRefreshRecoveryEnvelope {
  readonly ciphertext: Uint8Array<ArrayBuffer>;
  readonly nonce: Uint8Array<ArrayBuffer>;
  readonly authTag: Uint8Array<ArrayBuffer>;
  readonly keyId: string;
  readonly expiresAt: Date;
}

export interface IssuedCustomerRefresh {
  readonly tokenId: string;
  readonly refreshToken: string;
  readonly refreshTokenHash: Uint8Array<ArrayBuffer>;
  readonly accessToken: string;
  readonly accessExpiresAt: Date;
  readonly recovery: CustomerRefreshRecoveryEnvelope;
}

export interface StoredCustomerRefreshRecovery {
  readonly ciphertext: Uint8Array<ArrayBufferLike>;
  readonly nonce: Uint8Array<ArrayBufferLike>;
  readonly authTag: Uint8Array<ArrayBufferLike>;
  readonly keyId: string;
  readonly expiresAt: Date;
}

@Injectable()
export class CustomerSessionCrypto {
  constructor(@Inject(API_ENVIRONMENT) private readonly environment: ApiEnvironment) {}

  // اعتبارنامه‌های مشتری را با نوع، audience و شناسه‌های مستقل از نشست ادمین صادر می‌کند.
  async issue(customerId: string, now: Date): Promise<IssuedCustomerSession> {
    const sessionId = randomUUID();
    const csrfToken = this.deriveCsrfToken(
      sessionId,
      this.environment.authentication.csrfActiveKid,
    );
    const refreshToken = randomBytes(32).toString('base64url');
    const sessionExpiresAt = new Date(now.getTime() + CUSTOMER_SESSION_LIFETIME_SECONDS * 1000);
    const access = await this.issueAccess(customerId, sessionId, now);
    return {
      sessionId,
      csrfToken,
      csrfTokenHash: this.sha256(csrfToken),
      refreshToken,
      refreshTokenHash: this.sha256(refreshToken),
      accessToken: access.accessToken,
      accessExpiresAt: access.accessExpiresAt,
      sessionExpiresAt,
    };
  }

  // اعتبارنامه چرخشی را با بازیابی محدود برای پاسخ‌های هم‌زمان یا مبهم صادر می‌کند.
  async issueRefresh(
    customerId: string,
    sessionId: string,
    sessionExpiresAt: Date,
    now: Date,
  ): Promise<IssuedCustomerRefresh> {
    const tokenId = randomUUID();
    const refreshToken = randomBytes(32).toString('base64url');
    const recoveryExpiresAt = new Date(
      Math.min(
        sessionExpiresAt.getTime(),
        now.getTime() + this.environment.authentication.refreshReuseGraceSeconds * 1000,
      ),
    );
    const access = await this.issueAccess(customerId, sessionId, now);
    return {
      tokenId,
      refreshToken,
      refreshTokenHash: this.sha256(refreshToken),
      accessToken: access.accessToken,
      accessExpiresAt: access.accessExpiresAt,
      recovery: this.encryptRefreshToken(refreshToken, sessionId, tokenId, recoveryExpiresAt),
    };
  }

  hashOpaqueCredential(value: string): Uint8Array<ArrayBuffer> {
    return this.sha256(value);
  }

  verifyOpaqueCredential(value: string, storedHash: Uint8Array<ArrayBufferLike>): boolean {
    if (!/^[A-Za-z0-9_-]{43}$/u.test(value) || storedHash.byteLength !== 32) return false;
    return timingSafeEqual(this.sha256(value), storedHash);
  }

  // توکن CSRF پایدار نشست را فقط از کلیدهای معتبر فعلی یا قبلی بازیابی می‌کند.
  recoverCsrfToken(sessionId: string, storedHash: Uint8Array<ArrayBufferLike>): string | null {
    if (storedHash.byteLength !== 32) return null;
    let match: string | null = null;
    for (const kid of this.environment.authentication.csrfHmacKeys.keys()) {
      const candidate = this.deriveCsrfToken(sessionId, kid);
      if (timingSafeEqual(this.sha256(candidate), storedHash)) match = candidate;
    }
    return match;
  }

  verifyCsrfToken(token: string, storedHash: Uint8Array<ArrayBufferLike>): boolean {
    if (!/^[A-Za-z0-9_-]{43}$/u.test(token) || storedHash.byteLength !== 32) return false;
    return timingSafeEqual(this.sha256(token), storedHash);
  }

  // پاکت بازیابی فقط برای همان نشست، توکن جایگزین و مهلت مشخص قابل رمزگشایی است.
  decryptRefreshToken(
    sessionId: string,
    tokenId: string,
    envelope: StoredCustomerRefreshRecovery,
  ): string {
    const key = this.environment.authentication.refreshRecoveryKeys.get(envelope.keyId);
    if (
      key === undefined ||
      envelope.nonce.byteLength !== 12 ||
      envelope.authTag.byteLength !== 16 ||
      envelope.ciphertext.byteLength === 0
    ) {
      throw new Error('Customer refresh recovery envelope is unavailable.');
    }
    try {
      const decipher = createDecipheriv('aes-256-gcm', key, envelope.nonce, {
        authTagLength: 16,
      });
      decipher.setAAD(this.recoveryAad(sessionId, tokenId, envelope.expiresAt));
      decipher.setAuthTag(envelope.authTag);
      const plaintext = Buffer.concat([
        decipher.update(envelope.ciphertext),
        decipher.final(),
      ]).toString('utf8');
      if (!/^[A-Za-z0-9_-]{43}$/u.test(plaintext)) {
        throw new Error('Recovered customer credential has an invalid shape.');
      }
      return plaintext;
    } catch {
      throw new Error('Customer refresh recovery envelope authentication failed.');
    }
  }

  // Access مشتری را با typ و audience مستقل از ادمین و عمر ثابت صادر می‌کند.
  private async issueAccess(
    customerId: string,
    sessionId: string,
    now: Date,
  ): Promise<{ readonly accessToken: string; readonly accessExpiresAt: Date }> {
    const accessExpiresAt = new Date(now.getTime() + CUSTOMER_ACCESS_LIFETIME_SECONDS * 1000);
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
    return { accessToken, accessExpiresAt };
  }

  private deriveCsrfToken(sessionId: string, kid: string): string {
    const key = this.environment.authentication.csrfHmacKeys.get(kid);
    if (key === undefined) throw new Error('Configured CSRF key is unavailable.');
    return createHmac('sha256', key)
      .update(`customer-session:v1:${sessionId}`, 'utf8')
      .digest('base64url');
  }

  private encryptRefreshToken(
    refreshToken: string,
    sessionId: string,
    tokenId: string,
    expiresAt: Date,
  ): CustomerRefreshRecoveryEnvelope {
    const keyId = this.environment.authentication.refreshRecoveryActiveKid;
    const key = this.environment.authentication.refreshRecoveryKeys.get(keyId);
    if (key === undefined) throw new Error('Configured refresh recovery key is unavailable.');
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, nonce, { authTagLength: 16 });
    cipher.setAAD(this.recoveryAad(sessionId, tokenId, expiresAt));
    const ciphertext = Buffer.concat([cipher.update(refreshToken, 'utf8'), cipher.final()]);
    return {
      ciphertext: Uint8Array.from(ciphertext),
      nonce: Uint8Array.from(nonce),
      authTag: Uint8Array.from(cipher.getAuthTag()),
      keyId,
      expiresAt,
    };
  }

  private recoveryAad(sessionId: string, tokenId: string, expiresAt: Date): Buffer {
    return Buffer.from(
      `e-commerce:customer-refresh-recovery:v1:${sessionId}:${tokenId}:${expiresAt.getTime()}`,
      'utf8',
    );
  }

  private sha256(value: string): Uint8Array<ArrayBuffer> {
    return Uint8Array.from(createHash('sha256').update(value, 'utf8').digest());
  }
}
