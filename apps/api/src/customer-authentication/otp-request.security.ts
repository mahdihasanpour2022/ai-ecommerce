import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

import { Injectable } from '@nestjs/common';

import {
  AUTH_RATE_LIMITED_MESSAGE,
  OTP_IP_LIMIT_15_MINUTES,
  OTP_IP_LIMIT_24_HOURS,
} from './customer-authentication.constants.js';
import { CustomerAuthenticationError } from './customer-authentication.errors.js';

interface IpBucket {
  accepted: number[];
  pending: Map<string, number>;
}

export interface IpSendReservation {
  readonly key: string;
  readonly id: string;
}

@Injectable()
export class OtpRequestSecurity {
  private readonly buckets = new Map<string, IpBucket>();

  // یک ظرفیت IP را پیش از ارسال رزرو می‌کند تا درخواست‌های هم‌زمان از سقف عبور نکنند.
  reserve(request: IncomingMessage, now = Date.now()): IpSendReservation {
    const key = request.socket.remoteAddress ?? 'unknown';
    const bucket = this.buckets.get(key) ?? { accepted: [], pending: new Map<string, number>() };
    this.prune(bucket, now);
    const timestamps = [...bucket.accepted, ...bucket.pending.values()];
    const retryAfterSeconds = this.retryAfter(timestamps, now);
    if (retryAfterSeconds !== null) {
      throw new CustomerAuthenticationError(
        429,
        'AUTH_RATE_LIMITED',
        AUTH_RATE_LIMITED_MESSAGE,
        retryAfterSeconds,
      );
    }
    const id = randomUUID();
    bucket.pending.set(id, now);
    this.buckets.set(key, bucket);
    return { key, id };
  }

  // فقط ارسال پذیرفته‌شده یا مبهم را در پنجره محدودسازی قطعی می‌کند.
  commit(reservation: IpSendReservation, now = Date.now()): void {
    const bucket = this.buckets.get(reservation.key);
    if (bucket === undefined || !bucket.pending.delete(reservation.id)) return;
    bucket.accepted.push(now);
    this.prune(bucket, now);
  }

  release(reservation: IpSendReservation): void {
    const bucket = this.buckets.get(reservation.key);
    if (bucket === undefined) return;
    bucket.pending.delete(reservation.id);
    if (bucket.accepted.length === 0 && bucket.pending.size === 0) {
      this.buckets.delete(reservation.key);
    }
  }

  resetForTests(): void {
    this.buckets.clear();
  }

  private retryAfter(timestamps: readonly number[], now: number): number | null {
    const windows = [
      { milliseconds: 15 * 60_000, limit: OTP_IP_LIMIT_15_MINUTES },
      { milliseconds: 24 * 60 * 60_000, limit: OTP_IP_LIMIT_24_HOURS },
    ] as const;
    let retryAfter = 0;
    for (const window of windows) {
      const inWindow = timestamps
        .filter((timestamp) => now - timestamp < window.milliseconds)
        .sort((left, right) => left - right);
      if (inWindow.length >= window.limit) {
        const oldest = inWindow[0];
        if (oldest !== undefined) {
          retryAfter = Math.max(
            retryAfter,
            Math.ceil((oldest + window.milliseconds - now) / 1000),
          );
        }
      }
    }
    return retryAfter > 0 ? retryAfter : null;
  }

  private prune(bucket: IpBucket, now: number): void {
    const cutoff = now - 24 * 60 * 60_000;
    bucket.accepted = bucket.accepted.filter((timestamp) => timestamp > cutoff);
    for (const [id, timestamp] of bucket.pending) {
      if (timestamp <= cutoff) bucket.pending.delete(id);
    }
  }
}
