import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

import { Injectable } from '@nestjs/common';

import {
  AUTH_RATE_LIMITED_MESSAGE,
  OTP_VERIFICATION_IP_LIMIT,
} from './customer-authentication.constants.js';
import { CustomerAuthenticationError } from './customer-authentication.errors.js';

@Injectable()
export class OtpVerificationSecurity {
  private readonly failures = new Map<
    string,
    { committed: number[]; pending: Map<string, number> }
  >();

  // ظرفیت تلاش ناموفق را رزرو می‌کند تا درخواست‌های هم‌زمان از سقف عبور نکنند.
  reserve(
    request: IncomingMessage,
    now = Date.now(),
  ): { readonly key: string; readonly id: string } {
    const key = request.socket.remoteAddress ?? 'unknown';
    const bucket = this.current(key, now);
    const timestamps = [...bucket.committed, ...bucket.pending.values()].sort(
      (left, right) => left - right,
    );
    if (timestamps.length >= OTP_VERIFICATION_IP_LIMIT) {
      const oldest = timestamps[0];
      if (oldest === undefined) throw new Error('OTP verification throttle state is invalid.');
      throw new CustomerAuthenticationError(
        429,
        'AUTH_RATE_LIMITED',
        AUTH_RATE_LIMITED_MESSAGE,
        Math.max(1, Math.ceil((oldest + 15 * 60_000 - now) / 1000)),
      );
    }
    const id = randomUUID();
    bucket.pending.set(id, now);
    this.failures.set(key, bucket);
    return { key, id };
  }

  commitFailure(reservation: { readonly key: string; readonly id: string }, now = Date.now()): void {
    const bucket = this.failures.get(reservation.key);
    if (bucket === undefined || !bucket.pending.delete(reservation.id)) return;
    bucket.committed.push(now);
  }

  release(reservation: { readonly key: string; readonly id: string }): void {
    const bucket = this.failures.get(reservation.key);
    if (bucket === undefined) return;
    bucket.pending.delete(reservation.id);
    if (bucket.committed.length === 0 && bucket.pending.size === 0) {
      this.failures.delete(reservation.key);
    }
  }

  resetForTests(): void {
    this.failures.clear();
  }

  private current(
    key: string,
    now: number,
  ): { committed: number[]; pending: Map<string, number> } {
    const cutoff = now - 15 * 60_000;
    const bucket = this.failures.get(key) ?? { committed: [], pending: new Map<string, number>() };
    bucket.committed = bucket.committed.filter((timestamp) => timestamp > cutoff);
    for (const [id, timestamp] of bucket.pending) {
      if (timestamp <= cutoff) bucket.pending.delete(id);
    }
    return bucket;
  }
}
