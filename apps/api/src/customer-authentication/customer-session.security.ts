import type { IncomingMessage } from 'node:http';

import { Inject, Injectable } from '@nestjs/common';

import { LoginSecurity } from '../authentication/login-security.js';
import type { ApiEnvironment } from '../config/environment.js';
import { API_ENVIRONMENT } from '../config/tokens.js';
import {
  AUTH_RATE_LIMITED_MESSAGE,
  CUSTOMER_CSRF_VALIDATION_FAILED_MESSAGE,
} from './customer-authentication.constants.js';
import { CustomerAuthenticationError } from './customer-authentication.errors.js';
import { CustomerSessionCrypto } from './customer-session.crypto.js';

interface IpBucket {
  count: number;
  windowStartedAt: number;
}

@Injectable()
export class CustomerSessionSecurity {
  private readonly refreshIpBuckets = new Map<string, IpBucket>();

  constructor(
    private readonly requestBoundary: LoginSecurity,
    private readonly crypto: CustomerSessionCrypto,
    @Inject(API_ENVIRONMENT) private readonly environment: ApiEnvironment,
  ) {}

  assertRequestBoundary(request: IncomingMessage): void {
    this.requestBoundary.assertRequestBoundary(request);
  }

  // درخواست ناامن را هم به مبدأ مجاز و هم به CSRF همان نشست مقید می‌کند.
  assertCsrf(request: IncomingMessage, storedHash: Uint8Array<ArrayBufferLike>): void {
    try {
      this.assertRequestBoundary(request);
    } catch {
      this.invalidCsrf();
    }
    const header = request.headers['x-csrf-token'];
    if (typeof header !== 'string' || !this.crypto.verifyCsrfToken(header, storedHash)) {
      this.invalidCsrf();
    }
  }

  // سقف refresh مشتری را مستقل از نشست‌ها و تلاش‌های ادمین اعمال می‌کند.
  consumeRefreshIpAttempt(request: IncomingMessage, now = Date.now()): void {
    const key = request.socket.remoteAddress ?? 'unknown';
    const existing = this.refreshIpBuckets.get(key);
    const bucket =
      existing === undefined || now - existing.windowStartedAt >= 60_000
        ? { count: 0, windowStartedAt: now }
        : existing;
    if (bucket.count >= this.environment.authentication.refreshIpLimitPerMinute) {
      throw new CustomerAuthenticationError(
        429,
        'AUTH_RATE_LIMITED',
        AUTH_RATE_LIMITED_MESSAGE,
        Math.max(1, Math.ceil((bucket.windowStartedAt + 60_000 - now) / 1000)),
      );
    }
    bucket.count += 1;
    this.refreshIpBuckets.set(key, bucket);
  }

  resetForTests(): void {
    this.refreshIpBuckets.clear();
  }

  private invalidCsrf(): never {
    throw new CustomerAuthenticationError(
      403,
      'CSRF_VALIDATION_FAILED',
      CUSTOMER_CSRF_VALIDATION_FAILED_MESSAGE,
    );
  }
}
