import { Inject, Injectable } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';

import type { ApiEnvironment } from '../config/environment.js';
import { API_ENVIRONMENT } from '../config/tokens.js';
import { AuthenticationError } from './authentication.errors.js';
import { INVALID_REQUEST_MESSAGE, RATE_LIMITED_MESSAGE } from './authentication.constants.js';

interface IpBucket {
  count: number;
  windowStartedAt: number;
}

@Injectable()
export class LoginSecurity {
  private readonly ipBuckets = new Map<string, IpBucket>();

  constructor(@Inject(API_ENVIRONMENT) private readonly environment: ApiEnvironment) {}

  assertRequestBoundary(request: IncomingMessage): void {
    const fetchSite = request.headers['sec-fetch-site'];
    if (fetchSite === 'cross-site') {
      throw new AuthenticationError(403, 'ORIGIN_NOT_ALLOWED', INVALID_REQUEST_MESSAGE);
    }

    const origin = this.singleHeader(request.headers.origin);
    const referer = this.singleHeader(request.headers.referer);
    let candidate: string | undefined = origin;
    if (candidate === undefined && referer !== undefined) {
      try {
        candidate = new URL(referer).origin;
      } catch {
        throw new AuthenticationError(403, 'ORIGIN_NOT_ALLOWED', INVALID_REQUEST_MESSAGE);
      }
    }
    if (
      candidate === undefined ||
      !this.environment.authentication.corsAllowedOrigins.has(candidate)
    ) {
      throw new AuthenticationError(403, 'ORIGIN_NOT_ALLOWED', INVALID_REQUEST_MESSAGE);
    }
  }

  consumeIpAttempt(request: IncomingMessage, now = Date.now()): void {
    const key = request.socket.remoteAddress ?? 'unknown';
    const windowMilliseconds = this.environment.authentication.loginWindowSeconds * 1000;
    const existing = this.ipBuckets.get(key);
    const bucket =
      existing === undefined || now - existing.windowStartedAt >= windowMilliseconds
        ? { count: 0, windowStartedAt: now }
        : existing;
    if (bucket.count >= this.environment.authentication.loginIpLimit) {
      const retryAfter = Math.max(
        1,
        Math.ceil((bucket.windowStartedAt + windowMilliseconds - now) / 1000),
      );
      throw new AuthenticationError(429, 'AUTH_RATE_LIMITED', RATE_LIMITED_MESSAGE, retryAfter);
    }
    bucket.count += 1;
    this.ipBuckets.set(key, bucket);
  }

  resetForTests(): void {
    this.ipBuckets.clear();
  }

  private singleHeader(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) {
      throw new AuthenticationError(403, 'ORIGIN_NOT_ALLOWED', INVALID_REQUEST_MESSAGE);
    }
    return value;
  }
}
