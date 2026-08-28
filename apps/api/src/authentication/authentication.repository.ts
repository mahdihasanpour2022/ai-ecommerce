import { Inject, Injectable } from '@nestjs/common';

import type { ApiEnvironment } from '../config/environment.js';
import { API_ENVIRONMENT } from '../config/tokens.js';
import { PrismaService } from '../database/prisma.service.js';
import type { IssuedLoginCredentials } from './authentication.crypto.js';

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
  readonly expiresAt: Date;
  readonly rotatedAt: Date | null;
  readonly revokedAt: Date | null;
  readonly session: CurrentSessionRecord;
}

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

  async findAdmin(email: string): Promise<LoginAdminRecord | null> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { email },
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
        expiresAt: true,
        rotatedAt: true,
        revokedAt: true,
        session: { select: this.currentSessionSelection() },
      },
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
