import { Injectable } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';
import { CustomerOtpDeliveryStatus } from '../generated/prisma/enums.js';
import {
  AUTH_RATE_LIMITED_MESSAGE,
  OTP_MOBILE_LIMIT_15_MINUTES,
  OTP_MOBILE_LIMIT_24_HOURS,
  OTP_RESEND_NOT_READY_MESSAGE,
} from './customer-authentication.constants.js';
import { CustomerAuthenticationError } from './customer-authentication.errors.js';

export interface PrepareOtpChallenge {
  readonly challengeId: string;
  readonly clientReferenceId: string;
  readonly flowTokenHash: Buffer;
  readonly mobile: string;
  readonly mobileKey: Buffer;
  readonly otpDigest: Buffer;
  readonly expiresAt: Date;
  readonly resendAvailableAt: Date;
  readonly now: Date;
}

interface ChallengeTimestampRow {
  readonly created_at: Date;
}

@Injectable()
export class OtpRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  // قفل اختصاصی موبایل، cooldown، سقف‌های زمانی و جایگزینی چالش را اتمیک می‌کند.
  async prepare(command: PrepareOtpChallenge): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      await transaction.customerOtpMobileThrottle.upsert({
        where: { mobileKey: command.mobileKey },
        create: { mobileKey: command.mobileKey, updatedAt: command.now },
        update: { updatedAt: command.now },
      });
      await transaction.$queryRaw<Array<{ mobile_key: Uint8Array }>>`
        SELECT mobile_key
        FROM customer_otp_mobile_throttles
        WHERE mobile_key = ${command.mobileKey}
        FOR UPDATE
      `;

      const active = await transaction.customerOtpChallenge.findFirst({
        where: { mobile: command.mobile, verifiedAt: null, invalidatedAt: null },
        orderBy: { createdAt: 'desc' },
      });
      if (active !== null && command.now < active.resendAvailableAt) {
        const retryAfter = Math.max(
          1,
          Math.ceil((active.resendAvailableAt.getTime() - command.now.getTime()) / 1000),
        );
        throw new CustomerAuthenticationError(
          429,
          'OTP_RESEND_NOT_READY',
          OTP_RESEND_NOT_READY_MESSAGE,
          retryAfter,
        );
      }
      if (active !== null) {
        await transaction.customerOtpChallenge.update({
          where: { id: active.id },
          data: { invalidatedAt: command.now },
        });
      }

      const dayCutoff = new Date(command.now.getTime() - 24 * 60 * 60_000);
      const timestamps = await transaction.$queryRaw<ChallengeTimestampRow[]>`
        SELECT created_at
        FROM customer_otp_challenges
        WHERE mobile = ${command.mobile}
          AND delivery_status <> 'FAILED'::customer_otp_delivery_status
          AND created_at >= ${dayCutoff}
        ORDER BY created_at ASC
      `;
      const retryAfter = this.mobileRetryAfter(timestamps, command.now);
      if (retryAfter !== null) {
        throw new CustomerAuthenticationError(
          429,
          'AUTH_RATE_LIMITED',
          AUTH_RATE_LIMITED_MESSAGE,
          retryAfter,
        );
      }

      await transaction.customerOtpChallenge.create({
        data: {
          id: command.challengeId,
          clientReferenceId: command.clientReferenceId,
          flowTokenHash: command.flowTokenHash,
          mobile: command.mobile,
          otpDigest: command.otpDigest,
          expiresAt: command.expiresAt,
          resendAvailableAt: command.resendAvailableAt,
          createdAt: command.now,
          updatedAt: command.now,
        },
      });
    });
  }

  // نتیجه provider را بدون امکان بازنویسی یک وضعیت نهایی ثبت می‌کند.
  async reconcile(
    challengeId: string,
    status: 'ACCEPTED' | 'REJECTED' | 'UNKNOWN',
    now: Date,
  ): Promise<void> {
    const deliveryStatus =
      status === 'REJECTED'
        ? CustomerOtpDeliveryStatus.FAILED
        : CustomerOtpDeliveryStatus[status];
    const updated = await this.prisma.customerOtpChallenge.updateMany({
      where: {
        id: challengeId,
        deliveryStatus: CustomerOtpDeliveryStatus.PENDING,
        verifiedAt: null,
        invalidatedAt: null,
      },
      data: {
        deliveryStatus,
        ...(status === 'REJECTED' ? { invalidatedAt: now } : {}),
        updatedAt: now,
      },
    });
    if (updated.count !== 1) throw new Error('OTP challenge delivery state was not reconcilable.');
  }

  private mobileRetryAfter(rows: readonly ChallengeTimestampRow[], now: Date): number | null {
    const windows = [
      { milliseconds: 15 * 60_000, limit: OTP_MOBILE_LIMIT_15_MINUTES },
      { milliseconds: 24 * 60 * 60_000, limit: OTP_MOBILE_LIMIT_24_HOURS },
    ] as const;
    let retryAfter = 0;
    for (const window of windows) {
      const inWindow = rows.filter(
        (row) => now.getTime() - row.created_at.getTime() < window.milliseconds,
      );
      if (inWindow.length >= window.limit) {
        const oldest = inWindow[0];
        if (oldest !== undefined) {
          retryAfter = Math.max(
            retryAfter,
            Math.ceil(
              (oldest.created_at.getTime() + window.milliseconds - now.getTime()) / 1000,
            ),
          );
        }
      }
    }
    return retryAfter > 0 ? retryAfter : null;
  }
}
