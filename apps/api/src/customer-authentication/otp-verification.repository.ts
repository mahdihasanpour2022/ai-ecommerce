import { Injectable } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';
import {
  OTP_MAX_FAILED_ATTEMPTS,
  REGISTRATION_GRANT_LIFETIME_SECONDS,
} from './customer-authentication.constants.js';
import { CustomerSessionCrypto, type IssuedCustomerSession } from './customer-session.crypto.js';
import { OtpRequestCrypto } from './otp-request.crypto.js';

export interface CustomerSnapshot {
  readonly id: string;
  readonly mobile: string;
  readonly firstName: string;
  readonly lastName: string;
}

export type OtpVerificationDecision =
  | { readonly kind: 'flow_invalid' }
  | { readonly kind: 'expired' }
  | { readonly kind: 'invalid_code' }
  | { readonly kind: 'attempts_exceeded' }
  | { readonly kind: 'account_disabled' }
  | {
      readonly kind: 'authenticated';
      readonly customer: CustomerSnapshot;
      readonly credentials: IssuedCustomerSession;
    }
  | {
      readonly kind: 'registration_required';
      readonly flowToken: string;
      readonly expiresAt: Date;
    };

@Injectable()
export class OtpVerificationRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otpCrypto: OtpRequestCrypto,
    private readonly sessionCrypto: CustomerSessionCrypto,
  ) {}

  // قفل چالش، شمارش خطا، مصرف کد و ایجاد خروجی بعدی را در یک تراکنش انجام می‌دهد.
  async verify(
    flowTokenHash: Uint8Array<ArrayBuffer>,
    code: string,
    validFormat: boolean,
    now = new Date(),
  ): Promise<OtpVerificationDecision> {
    return this.prisma.$transaction(async (transaction) => {
      const locked = await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM customer_otp_challenges
        WHERE flow_token_hash = ${flowTokenHash}
        FOR UPDATE
      `;
      if (locked[0] === undefined) return { kind: 'flow_invalid' } as const;

      const challenge = await transaction.customerOtpChallenge.findUnique({
        where: { flowTokenHash },
      });
      if (
        challenge === null ||
        challenge.verifiedAt !== null ||
        challenge.invalidatedAt !== null ||
        (challenge.deliveryStatus !== 'ACCEPTED' && challenge.deliveryStatus !== 'UNKNOWN')
      ) {
        return { kind: 'flow_invalid' } as const;
      }
      if (challenge.expiresAt <= now) {
        await transaction.customerOtpChallenge.update({
          where: { id: challenge.id },
          data: { invalidatedAt: now, updatedAt: now },
        });
        return { kind: 'expired' } as const;
      }
      if (challenge.failedAttemptCount >= OTP_MAX_FAILED_ATTEMPTS) {
        await transaction.customerOtpChallenge.update({
          where: { id: challenge.id },
          data: { invalidatedAt: now, updatedAt: now },
        });
        return { kind: 'attempts_exceeded' } as const;
      }

      const matches = this.otpCrypto.verifyOtp(
        challenge.id,
        challenge.mobile,
        code,
        challenge.otpDigest,
      );
      if (!validFormat || !matches) {
        const failedAttemptCount = challenge.failedAttemptCount + 1;
        const terminal = failedAttemptCount >= OTP_MAX_FAILED_ATTEMPTS;
        await transaction.customerOtpChallenge.update({
          where: { id: challenge.id },
          data: {
            failedAttemptCount,
            invalidatedAt: terminal ? now : null,
            updatedAt: now,
          },
        });
        return terminal
          ? ({ kind: 'attempts_exceeded' } as const)
          : ({ kind: 'invalid_code' } as const);
      }

      const customerRows = await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM customers
        WHERE mobile = ${challenge.mobile}
        FOR UPDATE
      `;
      const customer =
        customerRows[0] === undefined
          ? null
          : await transaction.customer.findUnique({ where: { mobile: challenge.mobile } });
      await transaction.customerOtpChallenge.update({
        where: { id: challenge.id },
        data: { verifiedAt: now, updatedAt: now },
      });

      if (customer === null) {
        const grant = this.otpCrypto.registrationGrant();
        const expiresAt = new Date(now.getTime() + REGISTRATION_GRANT_LIFETIME_SECONDS * 1000);
        await transaction.customerRegistrationGrant.create({
          data: {
            id: grant.id,
            challengeId: challenge.id,
            flowTokenHash: grant.tokenHash,
            expiresAt,
            createdAt: now,
            updatedAt: now,
          },
        });
        return { kind: 'registration_required', flowToken: grant.token, expiresAt } as const;
      }
      if (customer.disabledAt !== null) return { kind: 'account_disabled' } as const;

      const credentials = await this.sessionCrypto.issue(customer.id, now);
      await transaction.customer.update({
        where: { id: customer.id },
        data: { lastLoginAt: now, updatedAt: now },
      });
      await transaction.customerAuthSession.create({
        data: {
          id: credentials.sessionId,
          customerId: customer.id,
          csrfTokenHash: credentials.csrfTokenHash,
          expiresAt: credentials.sessionExpiresAt,
          lastUsedAt: now,
          createdAt: now,
          updatedAt: now,
          refreshThrottle: { create: { windowStartedAt: null, attemptCount: 0 } },
          refreshTokens: {
            create: {
              tokenHash: credentials.refreshTokenHash,
              expiresAt: credentials.sessionExpiresAt,
              createdAt: now,
            },
          },
        },
      });
      return {
        kind: 'authenticated',
        customer: {
          id: customer.id,
          mobile: customer.mobile,
          firstName: customer.firstName,
          lastName: customer.lastName,
        },
        credentials,
      } as const;
    });
  }
}
