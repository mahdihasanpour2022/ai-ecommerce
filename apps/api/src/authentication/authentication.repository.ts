import { Inject, Injectable } from '@nestjs/common';

import type { ApiEnvironment } from '../config/environment.js';
import { API_ENVIRONMENT } from '../config/tokens.js';
import { PrismaService } from '../database/prisma.service.js';
import type {
  IssuedLoginCredentials,
  IssuedRefreshCredentials,
  StoredRecoveryEnvelope,
} from './authentication.crypto.js';

interface ThrottleRow {
  windowStartedAt: Date | null;
  failureCount: number;
  delayUntil: Date | null;
}

export interface LoginAdminRecord {
  readonly id: string;
  readonly passwordHash: string;
  readonly disabled: boolean;
  readonly eligible: boolean;
}

export interface CurrentSessionRecord {
  readonly id: string;
  readonly adminUserId: string;
  readonly csrfTokenHash: Uint8Array<ArrayBuffer>;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
  readonly adminUser: {
    readonly id: string;
    readonly email: string;
    readonly displayName: string;
    readonly disabledAt: Date | null;
    readonly roles: readonly {
      readonly role: {
        readonly code: string;
        readonly permissions: readonly {
          readonly permission: { readonly code: string };
        }[];
      };
    }[];
  };
}

export interface CurrentRefreshRecord {
  readonly id: string;
  readonly sessionId: string;
  readonly expiresAt: Date;
  readonly rotatedAt: Date | null;
  readonly revokedAt: Date | null;
  readonly replacedByTokenId: string | null;
  readonly session: CurrentSessionRecord;
}

interface RefreshThrottleRow {
  readonly windowStartedAt: Date | null;
  readonly attemptCount: number;
}

export type RefreshRotationDecision =
  | { readonly kind: 'rotated' }
  | {
      readonly kind: 'recovered';
      readonly tokenId: string;
      readonly tokenHash: Uint8Array<ArrayBuffer>;
      readonly envelope: StoredRecoveryEnvelope;
    }
  | { readonly kind: 'reused'; readonly sessionId: string }
  | { readonly kind: 'invalid' }
  | { readonly kind: 'expired' }
  | { readonly kind: 'authentication_required' }
  | { readonly kind: 'account_disabled' }
  | { readonly kind: 'insufficient_permission' }
  | { readonly kind: 'throttled'; readonly retryAfterSeconds: number };

@Injectable()
export class AuthenticationRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(API_ENVIRONMENT) private readonly environment: ApiEnvironment,
  ) {}

  async consumeAccountAttempt(
    identifierKey: Uint8Array<ArrayBuffer>,
    now = new Date(),
  ): Promise<number | null> {
    const config = this.environment.authentication;
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`
        INSERT INTO admin_login_throttles (identifier_key, failure_count, updated_at)
        VALUES (${identifierKey}, 0, ${now})
        ON CONFLICT (identifier_key) DO NOTHING
      `;
      const rows = await transaction.$queryRaw<ThrottleRow[]>`
        SELECT
          window_started_at AS "windowStartedAt",
          failure_count AS "failureCount",
          delay_until AS "delayUntil"
        FROM admin_login_throttles
        WHERE identifier_key = ${identifierKey}
        FOR UPDATE
      `;
      const row = rows[0];
      if (row === undefined) throw new Error('Login throttle row was not created.');
      if (row.delayUntil !== null && row.delayUntil > now) {
        return Math.max(1, Math.ceil((row.delayUntil.getTime() - now.getTime()) / 1000));
      }
      const windowExpired =
        row.windowStartedAt === null ||
        now.getTime() - row.windowStartedAt.getTime() >= config.loginWindowSeconds * 1000;
      const failureCount = windowExpired ? 1 : row.failureCount + 1;
      let delayUntil: Date | null = null;
      if (failureCount >= config.loginAccountFailureLimit) {
        const exponent = Math.min(30, failureCount - config.loginAccountFailureLimit);
        const delaySeconds = Math.min(
          config.loginMaxDelaySeconds,
          config.loginInitialDelaySeconds * 2 ** exponent,
        );
        delayUntil = new Date(now.getTime() + delaySeconds * 1000);
      }
      await transaction.adminLoginThrottle.update({
        where: { identifierKey },
        data: {
          windowStartedAt: windowExpired ? now : row.windowStartedAt,
          failureCount,
          delayUntil,
        },
      });
      return null;
    });
  }

  async findAdmin(
    identifier: string,
    identifierKind: 'email' | 'username',
  ): Promise<LoginAdminRecord | null> {
    const admin = await this.prisma.adminUser.findUnique({
      where: identifierKind === 'email' ? { email: identifier } : { username: identifier },
      select: {
        id: true,
        passwordHash: true,
        disabledAt: true,
        roles: {
          where: {
            role: {
              permissions: { some: { permission: { code: 'admin.access' } } },
            },
          },
          select: { roleId: true },
          take: 1,
        },
      },
    });
    if (admin === null) return null;
    return {
      id: admin.id,
      passwordHash: admin.passwordHash,
      disabled: admin.disabledAt !== null,
      eligible: admin.roles.length > 0,
    };
  }

  async findCurrentSession(sessionId: string): Promise<CurrentSessionRecord | null> {
    return this.prisma.authSession.findUnique({
      where: { id: sessionId },
      select: this.currentSessionSelection(),
    });
  }

  async findRefreshCredential(
    tokenHash: Uint8Array<ArrayBuffer>,
  ): Promise<CurrentRefreshRecord | null> {
    return this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        sessionId: true,
        expiresAt: true,
        rotatedAt: true,
        revokedAt: true,
        replacedByTokenId: true,
        session: { select: this.currentSessionSelection() },
      },
    });
  }

  async rotateOrRecoverRefresh(
    tokenHash: Uint8Array<ArrayBuffer>,
    expectedSessionId: string,
    expectedAdminId: string,
    candidate: IssuedRefreshCredentials,
    now = new Date(),
  ): Promise<RefreshRotationDecision> {
    const config = this.environment.authentication;
    return this.prisma.$transaction(async (transaction) => {
      const admins = await transaction.$queryRaw<{ id: string }[]>`
        SELECT id
        FROM admin_users
        WHERE id = CAST(${expectedAdminId} AS uuid)
        FOR UPDATE
      `;
      if (admins[0] === undefined) return { kind: 'invalid' } as const;
      const sessions = await transaction.$queryRaw<{ id: string }[]>`
        SELECT id
        FROM auth_sessions
        WHERE id = CAST(${expectedSessionId} AS uuid)
          AND admin_user_id = CAST(${expectedAdminId} AS uuid)
        FOR UPDATE
      `;
      if (sessions[0] === undefined) return { kind: 'invalid' } as const;
      await transaction.$queryRaw`
        SELECT aur.admin_user_id
        FROM admin_user_roles AS aur
        INNER JOIN role_permissions AS rp ON rp.role_id = aur.role_id
        INNER JOIN permissions AS p ON p.id = rp.permission_id
        WHERE aur.admin_user_id = CAST(${expectedAdminId} AS uuid)
          AND p.code = 'admin.access'
        FOR SHARE OF aur, rp
      `;
      const tokens = await transaction.$queryRaw<{ id: string }[]>`
        SELECT id
        FROM refresh_tokens
        WHERE token_hash = ${tokenHash}
        FOR UPDATE
      `;
      if (tokens[0] === undefined) return { kind: 'invalid' } as const;

      const token = await transaction.refreshToken.findUnique({
        where: { tokenHash },
        select: {
          id: true,
          sessionId: true,
          expiresAt: true,
          rotatedAt: true,
          revokedAt: true,
          replacedByTokenId: true,
          session: { select: this.currentSessionSelection() },
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
      if (token.session.adminUser.disabledAt !== null) {
        return { kind: 'account_disabled' } as const;
      }
      const hasAccess = token.session.adminUser.roles.some(({ role }) =>
        role.permissions.some(({ permission }) => permission.code === 'admin.access'),
      );
      if (!hasAccess) return { kind: 'insufficient_permission' } as const;

      const throttleRows = await transaction.$queryRaw<RefreshThrottleRow[]>`
        SELECT
          window_started_at AS "windowStartedAt",
          attempt_count AS "attemptCount"
        FROM auth_session_refresh_throttles
        WHERE session_id = CAST(${expectedSessionId} AS uuid)
        FOR UPDATE
      `;
      const throttle = throttleRows[0];
      if (throttle === undefined) throw new Error('Refresh throttle row is unavailable.');
      const windowMilliseconds = 60_000;
      const windowExpired =
        throttle.windowStartedAt === null ||
        now.getTime() - throttle.windowStartedAt.getTime() >= windowMilliseconds;
      if (!windowExpired && throttle.attemptCount >= config.refreshSessionLimitPerMinute) {
        return {
          kind: 'throttled',
          retryAfterSeconds: Math.max(
            1,
            Math.ceil(
              (throttle.windowStartedAt.getTime() + windowMilliseconds - now.getTime()) / 1000,
            ),
          ),
        } as const;
      }
      await transaction.authSessionRefreshThrottle.update({
        where: { sessionId: expectedSessionId },
        data: {
          windowStartedAt: windowExpired ? now : throttle.windowStartedAt,
          attemptCount: windowExpired ? 1 : throttle.attemptCount + 1,
        },
      });

      if (token.rotatedAt === null) {
        await transaction.refreshToken.update({
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
        await transaction.refreshToken.create({
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
        await transaction.refreshToken.update({
          where: { id: token.id },
          data: { replacedByTokenId: candidate.tokenId },
        });
        await transaction.authSession.update({
          where: { id: expectedSessionId },
          data: { lastUsedAt: now },
        });
        return { kind: 'rotated' } as const;
      }

      const withinGrace =
        now.getTime() - token.rotatedAt.getTime() <= config.refreshReuseGraceSeconds * 1000;
      const replacement =
        token.replacedByTokenId === null
          ? null
          : await transaction.refreshToken.findUnique({
              where: {
                id_sessionId: {
                  id: token.replacedByTokenId,
                  sessionId: expectedSessionId,
                },
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

      await transaction.authSession.update({
        where: { id: expectedSessionId },
        data: { revokedAt: now },
      });
      await transaction.refreshToken.updateMany({
        where: { sessionId: expectedSessionId, revokedAt: null },
        data: {
          revokedAt: now,
          recoveryCiphertext: null,
          recoveryNonce: null,
          recoveryAuthTag: null,
          recoveryKeyId: null,
          recoveryExpiresAt: null,
        },
      });
      await transaction.refreshToken.updateMany({
        where: { sessionId: expectedSessionId },
        data: {
          recoveryCiphertext: null,
          recoveryNonce: null,
          recoveryAuthTag: null,
          recoveryKeyId: null,
          recoveryExpiresAt: null,
        },
      });
      return { kind: 'reused', sessionId: expectedSessionId } as const;
    });
  }

  async revokeSessionForRefreshReuse(sessionId: string, now = new Date()): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      await transaction.authSession.updateMany({
        where: { id: sessionId, revokedAt: null },
        data: { revokedAt: now },
      });
      await transaction.refreshToken.updateMany({
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
      await transaction.refreshToken.updateMany({
        where: { sessionId },
        data: {
          recoveryCiphertext: null,
          recoveryNonce: null,
          recoveryAuthTag: null,
          recoveryKeyId: null,
          recoveryExpiresAt: null,
        },
      });
    });
  }

  async logoutKnownSession(
    tokenHash: Uint8Array<ArrayBuffer>,
    expectedSessionId: string,
    now = new Date(),
  ): Promise<boolean> {
    return this.prisma.$transaction(async (transaction) => {
      const sessions = await transaction.$queryRaw<{ id: string }[]>`
        SELECT id
        FROM auth_sessions
        WHERE id = CAST(${expectedSessionId} AS uuid)
        FOR UPDATE
      `;
      if (sessions[0] === undefined) return false;
      const tokens = await transaction.$queryRaw<{ id: string }[]>`
        SELECT id
        FROM refresh_tokens
        WHERE token_hash = ${tokenHash}
          AND session_id = CAST(${expectedSessionId} AS uuid)
        FOR UPDATE
      `;
      if (tokens[0] === undefined) return false;
      await transaction.authSession.updateMany({
        where: { id: expectedSessionId, revokedAt: null },
        data: { revokedAt: now },
      });
      await transaction.refreshToken.updateMany({
        where: { sessionId: expectedSessionId, revokedAt: null },
        data: {
          revokedAt: now,
          recoveryCiphertext: null,
          recoveryNonce: null,
          recoveryAuthTag: null,
          recoveryKeyId: null,
          recoveryExpiresAt: null,
        },
      });
      await transaction.refreshToken.updateMany({
        where: { sessionId: expectedSessionId },
        data: {
          recoveryCiphertext: null,
          recoveryNonce: null,
          recoveryAuthTag: null,
          recoveryKeyId: null,
          recoveryExpiresAt: null,
        },
      });
      return true;
    });
  }

  async commitSuccessfulLogin(
    adminUserId: string,
    identifierKey: Uint8Array<ArrayBuffer>,
    credentials: IssuedLoginCredentials,
    replacementPasswordHash: string | null,
    now = new Date(),
  ): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      if (replacementPasswordHash !== null) {
        await transaction.adminUser.update({
          where: { id: adminUserId },
          data: { passwordHash: replacementPasswordHash },
        });
      }
      await transaction.authSession.create({
        data: {
          id: credentials.sessionId,
          adminUserId,
          csrfTokenHash: credentials.csrfTokenHash,
          expiresAt: credentials.sessionExpiresAt,
          lastUsedAt: now,
          createdAt: now,
          updatedAt: now,
          refreshThrottle: {
            create: { windowStartedAt: null, attemptCount: 0 },
          },
          refreshTokens: {
            create: {
              tokenHash: credentials.refreshTokenHash,
              expiresAt: credentials.sessionExpiresAt,
              createdAt: now,
            },
          },
        },
      });
      await transaction.adminLoginThrottle.deleteMany({ where: { identifierKey } });
    });
  }

  private currentSessionSelection() {
    return {
      id: true,
      adminUserId: true,
      csrfTokenHash: true,
      expiresAt: true,
      revokedAt: true,
      adminUser: {
        select: {
          id: true,
          email: true,
          displayName: true,
          disabledAt: true,
          roles: {
            select: {
              role: {
                select: {
                  code: true,
                  permissions: {
                    select: { permission: { select: { code: true } } },
                  },
                },
              },
            },
          },
        },
      },
    } as const;
  }
}
