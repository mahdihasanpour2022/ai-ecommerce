import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
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

@Injectable()
export class AuthenticationCrypto {
  private readonly dummyHash: Promise<string>;

  constructor(@Inject(API_ENVIRONMENT) private readonly environment: ApiEnvironment) {
    this.dummyHash = argon2.hash(randomBytes(32), this.argonOptions());
  }

  identifierKey(email: string): Uint8Array<ArrayBuffer> {
    return Uint8Array.from(
      createHmac('sha256', this.environment.authentication.loginThrottleHmacKey)
        .update(email, 'utf8')
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
    const jti = randomUUID();
    const issuedAt = Math.floor(now.getTime() / 1000);
    const accessExpiresAt = new Date(
      now.getTime() + this.environment.authentication.accessTokenTtlSeconds * 1000,
    );
    const sessionExpiresAt = new Date(
      now.getTime() + this.environment.authentication.refreshTokenTtlSeconds * 1000,
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

  private deriveCsrfToken(sessionId: string, kid: string): string {
    const key = this.environment.authentication.csrfHmacKeys.get(kid);
    if (key === undefined) throw new Error('Configured CSRF key is unavailable.');
    return createHmac('sha256', key).update(sessionId, 'utf8').digest('base64url');
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
