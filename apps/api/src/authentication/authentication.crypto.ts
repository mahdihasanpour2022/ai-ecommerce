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
import * as argon2 from 'argon2';
import { SignJWT } from 'jose';

import type { ApiEnvironment } from '../config/environment.js';
import { API_ENVIRONMENT } from '../config/tokens.js';

export interface IssuedLoginCredentials {
  readonly sessionId: string;
  readonly csrfToken: string;
  readonly csrfTokenHash: Uint8Array<ArrayBuffer>;
  readonly refreshToken: string;
  readonly refreshTokenHash: Uint8Array<ArrayBuffer>;
  readonly accessToken: string;
  readonly accessExpiresAt: Date;
  readonly sessionExpiresAt: Date;
}

export interface RecoveryEnvelope {
  readonly ciphertext: Uint8Array<ArrayBuffer>;
  readonly nonce: Uint8Array<ArrayBuffer>;
  readonly authTag: Uint8Array<ArrayBuffer>;
  readonly keyId: string;
  readonly expiresAt: Date;
}

export interface IssuedRefreshCredentials {
  readonly tokenId: string;
  readonly refreshToken: string;
  readonly refreshTokenHash: Uint8Array<ArrayBuffer>;
  readonly accessToken: string;
  readonly accessExpiresAt: Date;
  readonly recovery: RecoveryEnvelope;
}

export interface StoredRecoveryEnvelope {
  readonly ciphertext: Uint8Array<ArrayBufferLike>;
  readonly nonce: Uint8Array<ArrayBufferLike>;
  readonly authTag: Uint8Array<ArrayBufferLike>;
  readonly keyId: string;
  readonly expiresAt: Date;
}

@Injectable()
export class AuthenticationCrypto {
  private readonly dummyHash: Promise<string>;

  constructor(@Inject(API_ENVIRONMENT) private readonly environment: ApiEnvironment) {
    this.dummyHash = argon2.hash(randomBytes(32), this.argonOptions());
  }

  identifierKey(identifier: string): Uint8Array<ArrayBuffer> {
    return Uint8Array.from(
      createHmac('sha256', this.environment.authentication.loginThrottleHmacKey)
        .update(identifier, 'utf8')
        .digest(),
    );
  }

  async verifyPassword(passwordHash: string | null, password: string): Promise<boolean> {
    const hash = passwordHash ?? (await this.dummyHash);
    try {
      const valid = await argon2.verify(hash, password);
      return passwordHash !== null && valid;
    } catch {
      return false;
    }
  }

  passwordNeedsRehash(passwordHash: string): boolean {
    return argon2.needsRehash(passwordHash, this.argonOptions());
  }

  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, this.argonOptions());
  }

  async issueLoginCredentials(
    adminUserId: string,
    now = new Date(),
  ): Promise<IssuedLoginCredentials> {
    const sessionId = randomUUID();
    const csrfToken = this.deriveCsrfToken(
      sessionId,
      this.environment.authentication.csrfActiveKid,
    );
    const refreshToken = randomBytes(32).toString('base64url');
    const sessionExpiresAt = new Date(
      now.getTime() + this.environment.authentication.refreshTokenTtlSeconds * 1000,
    );
    const access = await this.issueAccessCredential(adminUserId, sessionId, now);

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

  async issueRefreshCredentials(
    adminUserId: string,
    sessionId: string,
    sessionExpiresAt: Date,
    now = new Date(),
  ): Promise<IssuedRefreshCredentials> {
    const tokenId = randomUUID();
    const refreshToken = randomBytes(32).toString('base64url');
    const recoveryExpiresAt = new Date(
      Math.min(
        sessionExpiresAt.getTime(),
        now.getTime() + this.environment.authentication.refreshReuseGraceSeconds * 1000,
      ),
    );
    const access = await this.issueAccessCredential(adminUserId, sessionId, now);
    return {
      tokenId,
      refreshToken,
      refreshTokenHash: this.sha256(refreshToken),
      accessToken: access.accessToken,
      accessExpiresAt: access.accessExpiresAt,
      recovery: this.encryptRefreshToken(refreshToken, sessionId, tokenId, recoveryExpiresAt),
    };
  }

  async issueAccessCredential(
    adminUserId: string,
    sessionId: string,
    now = new Date(),
  ): Promise<{ accessToken: string; accessExpiresAt: Date }> {
    const issuedAt = Math.floor(now.getTime() / 1000);
    const jti = randomUUID();
    const accessExpiresAt = new Date(
      now.getTime() + this.environment.authentication.accessTokenTtlSeconds * 1000,
    );
    const accessToken = await new SignJWT({ sid: sessionId })
      .setProtectedHeader({
        alg: 'EdDSA',
        typ: 'at+jwt',
        kid: this.environment.authentication.jwtActiveKid,
      })
      .setSubject(adminUserId)
      .setIssuer(this.environment.authentication.jwtIssuer)
      .setAudience(this.environment.authentication.jwtAudience)
      .setJti(jti)
      .setIssuedAt(issuedAt)
      .setExpirationTime(Math.floor(accessExpiresAt.getTime() / 1000))
      .sign(this.environment.authentication.jwtPrivateKey);
    return { accessToken, accessExpiresAt };
  }

  decryptRefreshToken(
    sessionId: string,
    tokenId: string,
    envelope: StoredRecoveryEnvelope,
  ): string {
    const key = this.environment.authentication.refreshRecoveryKeys.get(envelope.keyId);
    if (
      key === undefined ||
      envelope.nonce.byteLength !== 12 ||
      envelope.authTag.byteLength !== 16 ||
      envelope.ciphertext.byteLength === 0
    ) {
      throw new Error('Refresh recovery envelope is unavailable.');
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
        throw new Error('Recovered credential has an invalid shape.');
      }
      return plaintext;
    } catch {
      throw new Error('Refresh recovery envelope authentication failed.');
    }
  }

  recoverCsrfToken(sessionId: string, storedHash: Uint8Array<ArrayBufferLike>): string | null {
    if (storedHash.byteLength !== 32) return null;
    let match: string | null = null;
    const expected = Buffer.from(storedHash);
    for (const kid of this.environment.authentication.csrfHmacKeys.keys()) {
      const candidate = this.deriveCsrfToken(sessionId, kid);
      const candidateHash = Buffer.from(this.sha256(candidate));
      if (timingSafeEqual(candidateHash, expected)) match = candidate;
    }
    return match;
  }

  verifyCsrfToken(token: string, storedHash: Uint8Array<ArrayBufferLike>): boolean {
    if (!/^[A-Za-z0-9_-]{43}$/u.test(token) || storedHash.byteLength !== 32) return false;
    return timingSafeEqual(Buffer.from(this.sha256(token)), Buffer.from(storedHash));
  }

  hashOpaqueCredential(value: string): Uint8Array<ArrayBuffer> {
    return this.sha256(value);
  }

  verifyOpaqueCredential(value: string, storedHash: Uint8Array<ArrayBufferLike>): boolean {
    if (!/^[A-Za-z0-9_-]{43}$/u.test(value) || storedHash.byteLength !== 32) return false;
    return timingSafeEqual(Buffer.from(this.sha256(value)), Buffer.from(storedHash));
  }

  private deriveCsrfToken(sessionId: string, kid: string): string {
    const key = this.environment.authentication.csrfHmacKeys.get(kid);
    if (key === undefined) throw new Error('Configured CSRF key is unavailable.');
    return createHmac('sha256', key).update(sessionId, 'utf8').digest('base64url');
  }

  private encryptRefreshToken(
    refreshToken: string,
    sessionId: string,
    tokenId: string,
    expiresAt: Date,
  ): RecoveryEnvelope {
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
      `e-commerce:refresh-recovery:v1:${sessionId}:${tokenId}:${expiresAt.getTime()}`,
      'utf8',
    );
  }

  private sha256(value: string): Uint8Array<ArrayBuffer> {
    return Uint8Array.from(createHash('sha256').update(value, 'utf8').digest());
  }

  private argonOptions(): argon2.HashOptions & { raw: false } {
    return {
      raw: false,
      type: argon2.argon2id,
      version: 0x13,
      memoryCost: this.environment.authentication.argon2MemoryKiB,
      timeCost: this.environment.authentication.argon2TimeCost,
      parallelism: this.environment.authentication.argon2Parallelism,
      hashLength: 32,
    };
  }
}
