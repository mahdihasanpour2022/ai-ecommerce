import { Inject, Injectable } from '@nestjs/common';

import type { ApiEnvironment } from '../config/environment.js';
import { API_ENVIRONMENT } from '../config/tokens.js';
import { PrismaService } from '../database/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import type {
  IssuedCustomerRefresh,
  StoredCustomerRefreshRecovery,
} from './customer-session.crypto.js';

export interface CurrentCustomerSession {
  readonly id: string;
  readonly customerId: string;
  readonly csrfTokenHash: Uint8Array<ArrayBuffer>;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
  readonly customer: {
    readonly id: string;
    readonly mobile: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly disabledAt: Date | null;
  };
}

export interface CurrentCustomerRefresh {
  readonly id: string;
  readonly sessionId: string;
  readonly expiresAt: Date;
  readonly rotatedAt: Date | null;
  readonly revokedAt: Date | null;
  readonly replacedByTokenId: string | null;
  readonly session: CurrentCustomerSession;
}

export type CustomerRefreshDecision =
  | { readonly kind: 'rotated' }
  | {
      readonly kind: 'recovered';
      readonly tokenId: string;
      readonly tokenHash: Uint8Array<ArrayBuffer>;
      readonly envelope: StoredCustomerRefreshRecovery;
    }
  | { readonly kind: 'reused'; readonly sessionId: string }
  | { readonly kind: 'invalid' }
  | { readonly kind: 'expired' }
  | { readonly kind: 'authentication_required' }
  | { readonly kind: 'account_disabled' }
  | { readonly kind: 'throttled'; readonly retryAfterSeconds: number };

export type CustomerBrowserFlow =
  | { readonly kind: 'mobile_required' }
  | {
      readonly kind: 'otp_pending';
      readonly mobile: string;
      readonly expiresAt: Date;
      readonly resendAvailableAt: Date;
    }
  | { readonly kind: 'registration_required'; readonly expiresAt: Date };

interface RefreshThrottleRow {
  readonly windowStartedAt: Date | null;
  readonly attemptCount: number;
}

@Injectable()
export class CustomerSessionRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(API_ENVIRONMENT) private readonly environment: ApiEnvironment,
  ) {}

  async findSession(sessionId: string): Promise<CurrentCustomerSession | null> {
    return this.prisma.customerAuthSession.findUnique({
      where: { id: sessionId },
      select: this.sessionSelection(),
    });
  }

  async findRefresh(
    tokenHash: Uint8Array<ArrayBuffer>,
  ): Promise<CurrentCustomerRefresh | null> {
    return this.prisma.customerRefreshToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        sessionId: true,
        expiresAt: true,
        rotatedAt: true,
        revokedAt: true,
        replacedByTokenId: true,
        session: { select: this.sessionSelection() },
      },
    });
  }

  // قفل مشتری، نشست، throttle و refresh مانع دو rotation مستقل و مصرف دوباره خارج از grace می‌شود.
  async rotateOrRecover(
    tokenHash: Uint8Array<ArrayBuffer>,
    expectedSessionId: string,
    expectedCustomerId: string,
    candidate: IssuedCustomerRefresh,
    now: Date,
  ): Promise<CustomerRefreshDecision> {
    const config = this.environment.authentication;
    return this.prisma.$transaction(async (transaction) => {
      const customers = await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM customers
        WHERE id = CAST(${expectedCustomerId} AS uuid)
        FOR UPDATE
      `;
      if (customers[0] === undefined) return { kind: 'invalid' } as const;
      const sessions = await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM customer_auth_sessions
        WHERE id = CAST(${expectedSessionId} AS uuid)
          AND customer_id = CAST(${expectedCustomerId} AS uuid)
        FOR UPDATE
      `;
      if (sessions[0] === undefined) return { kind: 'invalid' } as const;
      const tokens = await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM customer_refresh_tokens
        WHERE token_hash = ${tokenHash}
        FOR UPDATE
      `;
      if (tokens[0] === undefined) return { kind: 'invalid' } as const;

      const token = await transaction.customerRefreshToken.findUnique({
        where: { tokenHash },
        select: {
          id: true,
          sessionId: true,
          expiresAt: true,
          rotatedAt: true,
          revokedAt: true,
          replacedByTokenId: true,
          session: { select: this.sessionSelection() },
        },
      });
      if (token === null || token.sessionId !== expectedSessionId) {
        return { kind: 'invalid' } as const;
      }
      if (token.revokedAt !== null) return { kind: 'invalid' } as const;
      if (token.session.revokedAt !== null) return { kind: 'authentication_required' } as const;
      if (token.expiresAt <= now || token.session.expiresAt <= now) {
        return { kind: 'expired' } as const;
      }
      if (token.session.customer.disabledAt !== null) {
        return { kind: 'account_disabled' } as const;
      }

      const throttleRows = await transaction.$queryRaw<RefreshThrottleRow[]>`
        SELECT
          window_started_at AS "windowStartedAt",
          attempt_count AS "attemptCount"
        FROM customer_auth_session_refresh_throttles
        WHERE session_id = CAST(${expectedSessionId} AS uuid)
        FOR UPDATE
      `;
      const throttle = throttleRows[0];
      if (throttle === undefined) throw new Error('Customer refresh throttle is unavailable.');
      const windowExpired =
        throttle.windowStartedAt === null ||
        now.getTime() - throttle.windowStartedAt.getTime() >= 60_000;
      if (!windowExpired && throttle.attemptCount >= config.refreshSessionLimitPerMinute) {
        return {
          kind: 'throttled',
          retryAfterSeconds: Math.max(
            1,
            Math.ceil((throttle.windowStartedAt.getTime() + 60_000 - now.getTime()) / 1000),
          ),
        } as const;
      }
      await transaction.customerAuthSessionRefreshThrottle.update({
        where: { sessionId: expectedSessionId },
        data: {
          windowStartedAt: windowExpired ? now : throttle.windowStartedAt,
          attemptCount: windowExpired ? 1 : throttle.attemptCount + 1,
        },
      });

      if (token.rotatedAt === null) {
        await transaction.customerRefreshToken.update({
          where: { id: token.id },
          data: {
            rotatedAt: now,
            recoveryCiphertext: null,
            recoveryNonce: null,
            recoveryAuthTag: null,
            recoveryKeyId: null,
            recoveryExpiresAt: null,
          },
        });
        await transaction.customerRefreshToken.create({
          data: {
            id: candidate.tokenId,
            sessionId: expectedSessionId,
            tokenHash: candidate.refreshTokenHash,
            expiresAt: token.session.expiresAt,
            recoveryCiphertext: candidate.recovery.ciphertext,
            recoveryNonce: candidate.recovery.nonce,
            recoveryAuthTag: candidate.recovery.authTag,
            recoveryKeyId: candidate.recovery.keyId,
            recoveryExpiresAt: candidate.recovery.expiresAt,
            createdAt: now,
          },
        });
        await transaction.customerRefreshToken.update({
          where: { id: token.id },
          data: { replacedByTokenId: candidate.tokenId },
        });
        await transaction.customerAuthSession.update({
          where: { id: expectedSessionId },
          data: { lastUsedAt: now, updatedAt: now },
        });
        return { kind: 'rotated' } as const;
      }

      const withinGrace =
        now.getTime() - token.rotatedAt.getTime() <= config.refreshReuseGraceSeconds * 1000;
      const replacement =
        token.replacedByTokenId === null
          ? null
          : await transaction.customerRefreshToken.findUnique({
              where: {
                id_sessionId: { id: token.replacedByTokenId, sessionId: expectedSessionId },
              },
              select: {
                id: true,
                tokenHash: true,
                rotatedAt: true,
                revokedAt: true,
                expiresAt: true,
                recoveryCiphertext: true,
                recoveryNonce: true,
                recoveryAuthTag: true,
                recoveryKeyId: true,
                recoveryExpiresAt: true,
              },
            });
      if (
        withinGrace &&
        replacement !== null &&
        replacement.rotatedAt === null &&
        replacement.revokedAt === null &&
        replacement.expiresAt > now &&
        replacement.recoveryCiphertext !== null &&
        replacement.recoveryNonce !== null &&
        replacement.recoveryAuthTag !== null &&
        replacement.recoveryKeyId !== null &&
        replacement.recoveryExpiresAt !== null &&
        replacement.recoveryExpiresAt > now
      ) {
        return {
          kind: 'recovered',
          tokenId: replacement.id,
          tokenHash: replacement.tokenHash,
          envelope: {
            ciphertext: replacement.recoveryCiphertext,
            nonce: replacement.recoveryNonce,
            authTag: replacement.recoveryAuthTag,
            keyId: replacement.recoveryKeyId,
            expiresAt: replacement.recoveryExpiresAt,
          },
        } as const;
      }

      await this.revokeWithinTransaction(transaction, expectedSessionId, now);
      return { kind: 'reused', sessionId: expectedSessionId } as const;
    });
  }

  async revokeSession(sessionId: string, now: Date): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      await this.revokeWithinTransaction(transaction, sessionId, now);
    });
  }

  // logout فقط همان نشستی را که refresh ارائه‌شده به آن تعلق دارد باطل می‌کند.
  async logoutKnownSession(
    tokenHash: Uint8Array<ArrayBuffer>,
    expectedSessionId: string,
    now: Date,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (transaction) => {
      const sessions = await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM customer_auth_sessions
        WHERE id = CAST(${expectedSessionId} AS uuid)
        FOR UPDATE
      `;
      if (sessions[0] === undefined) return false;
      const tokens = await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM customer_refresh_tokens
        WHERE token_hash = ${tokenHash}
          AND session_id = CAST(${expectedSessionId} AS uuid)
        FOR UPDATE
      `;
      if (tokens[0] === undefined) return false;
      await this.revokeWithinTransaction(transaction, expectedSessionId, now);
      return true;
    });
  }

  // وضعیت flow را فقط از authority هش‌شده سرور و بدون حدس از مسیر کلاینت برمی‌گرداند.
  async resolveFlow(
    flowTokenHash: Uint8Array<ArrayBuffer>,
    now: Date,
  ): Promise<CustomerBrowserFlow> {
    const grant = await this.prisma.customerRegistrationGrant.findUnique({
      where: { flowTokenHash },
      select: { expiresAt: true, consumedAt: true, invalidatedAt: true },
    });
    if (
      grant !== null &&
      grant.consumedAt === null &&
      grant.invalidatedAt === null &&
      grant.expiresAt > now
    ) {
      return { kind: 'registration_required', expiresAt: grant.expiresAt };
    }
    const challenge = await this.prisma.customerOtpChallenge.findUnique({
      where: { flowTokenHash },
      select: {
        mobile: true,
        deliveryStatus: true,
        expiresAt: true,
        resendAvailableAt: true,
        verifiedAt: true,
        invalidatedAt: true,
      },
    });
    if (
      challenge !== null &&
      challenge.verifiedAt === null &&
      challenge.invalidatedAt === null &&
      challenge.expiresAt > now &&
      (challenge.deliveryStatus === 'ACCEPTED' || challenge.deliveryStatus === 'UNKNOWN')
    ) {
      return {
        kind: 'otp_pending',
        mobile: challenge.mobile,
        expiresAt: challenge.expiresAt,
        resendAvailableAt: challenge.resendAvailableAt,
      };
    }
    return { kind: 'mobile_required' };
  }

  // ابطال نشست همه توکن‌های همان نشست و پاکت‌های بازیابی حساس را یکجا از اعتبار خارج می‌کند.
  private async revokeWithinTransaction(
    transaction: Prisma.TransactionClient,
    sessionId: string,
    now: Date,
  ): Promise<void> {
    await transaction.customerAuthSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: now, updatedAt: now },
    });
    await transaction.customerRefreshToken.updateMany({
      where: { sessionId, revokedAt: null },
      data: {
        revokedAt: now,
        recoveryCiphertext: null,
        recoveryNonce: null,
        recoveryAuthTag: null,
        recoveryKeyId: null,
        recoveryExpiresAt: null,
      },
    });
    await transaction.customerRefreshToken.updateMany({
      where: { sessionId },
      data: {
        recoveryCiphertext: null,
        recoveryNonce: null,
        recoveryAuthTag: null,
        recoveryKeyId: null,
        recoveryExpiresAt: null,
      },
    });
  }

  private sessionSelection() {
    return {
      id: true,
      customerId: true,
      csrfTokenHash: true,
      expiresAt: true,
      revokedAt: true,
      customer: {
        select: {
          id: true,
          mobile: true,
          firstName: true,
          lastName: true,
          disabledAt: true,
        },
      },
    } as const;
  }
}
