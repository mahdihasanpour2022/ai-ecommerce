import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';

import type { ApiEnvironment } from '../config/environment.js';
import { API_ENVIRONMENT } from '../config/tokens.js';

export interface OtpSecrets {
  readonly challengeId: string;
  readonly clientReferenceId: string;
  readonly code: string;
  readonly flowToken: string;
  readonly flowTokenHash: Uint8Array<ArrayBuffer>;
  readonly mobileKey: Uint8Array<ArrayBuffer>;
  readonly otpDigest: Uint8Array<ArrayBuffer>;
}

@Injectable()
export class OtpRequestCrypto {
  constructor(@Inject(API_ENVIRONMENT) private readonly environment: ApiEnvironment) {}

  // کد خام فقط در حافظه ساخته می‌شود و برای ذخیره‌سازی به digest وابسته به چالش تبدیل می‌شود.
  issue(mobile: string): OtpSecrets {
    const challengeId = randomUUID();
    const clientReferenceId = randomUUID();
    const code = String(randomInt(100_000, 1_000_000));
    const flowToken = randomBytes(32).toString('base64url');
    return {
      challengeId,
      clientReferenceId,
      code,
      flowToken,
      flowTokenHash: this.flowTokenHash(flowToken),
      mobileKey: Uint8Array.from(
        createHmac('sha256', this.environment.customerAuthentication.mobileThrottleHmacKey)
          .update(`customer-mobile:v1:${mobile}`)
          .digest(),
      ),
      otpDigest: this.otpDigest(challengeId, mobile, code),
    };
  }

  flowTokenHash(flowToken: string): Uint8Array<ArrayBuffer> {
    return Uint8Array.from(createHash('sha256').update(flowToken, 'utf8').digest());
  }

  // مقایسه digest با طول ثابت انجام می‌شود تا نتیجه از زمان اجرا قابل استنباط نباشد.
  verifyOtp(
    challengeId: string,
    mobile: string,
    code: string,
    storedDigest: Uint8Array<ArrayBufferLike>,
  ): boolean {
    const candidate = this.otpDigest(challengeId, mobile, code);
    return storedDigest.length === candidate.length && timingSafeEqual(storedDigest, candidate);
  }

  registrationGrant(): {
    readonly id: string;
    readonly token: string;
    readonly tokenHash: Uint8Array<ArrayBuffer>;
  } {
    const token = randomBytes(32).toString('base64url');
    return { id: randomUUID(), token, tokenHash: this.flowTokenHash(token) };
  }

  private otpDigest(
    challengeId: string,
    mobile: string,
    code: string,
  ): Uint8Array<ArrayBuffer> {
    return Uint8Array.from(
      createHmac('sha256', this.environment.customerAuthentication.otpHmacKey)
        .update(`customer-otp:v1:${challengeId}:${mobile}:${code}`)
        .digest(),
    );
  }
}
