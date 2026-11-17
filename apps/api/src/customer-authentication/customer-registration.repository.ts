import { Injectable } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';
import { CustomerSessionCrypto, type IssuedCustomerSession } from './customer-session.crypto.js';
import type { CustomerRegistrationInput } from './customer-registration.dto.js';
import type { CustomerSnapshot } from './otp-verification.repository.js';

export type CustomerRegistrationDecision =
  | { readonly kind: 'flow_invalid' }
  | { readonly kind: 'expired' }
  | { readonly kind: 'account_disabled' }
  | {
      readonly kind: 'authenticated';
      readonly customer: CustomerSnapshot;
      readonly credentials: IssuedCustomerSession;
    };

@Injectable()
export class CustomerRegistrationRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionCrypto: CustomerSessionCrypto,
  ) {}

  // grant، موبایل، ساخت مشتری و نشست اولیه را در یک تراکنش قفل‌شده و غیرقابل تکرار نهایی می‌کند.
  async complete(
    flowTokenHash: Uint8Array<ArrayBuffer>,
    input: CustomerRegistrationInput,
    now = new Date(),
  ): Promise<CustomerRegistrationDecision> {
    return this.prisma.$transaction(async (transaction) => {
      const locked = await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM customer_registration_grants
        WHERE flow_token_hash = ${flowTokenHash}
        FOR UPDATE
      `;
      if (locked[0] === undefined) return { kind: 'flow_invalid' } as const;

      const grant = await transaction.customerRegistrationGrant.findUnique({
        where: { flowTokenHash },
        include: { challenge: true },
      });
      if (
        grant === null ||
        grant.consumedAt !== null ||
        grant.invalidatedAt !== null ||
        grant.challenge.verifiedAt === null
      ) {
        return { kind: 'flow_invalid' } as const;
      }
      if (grant.expiresAt <= now) {
        await transaction.customerRegistrationGrant.update({
          where: { id: grant.id },
          data: { invalidatedAt: now, updatedAt: now },
        });
        return { kind: 'expired' } as const;
      }

      await transaction.$queryRaw<Array<{ lock_result: string }>>`
        SELECT pg_advisory_xact_lock(hashtextextended(${grant.challenge.mobile}, 0))::text AS lock_result
      `;
      let customer = await transaction.customer.findUnique({
        where: { mobile: grant.challenge.mobile },
      });
      if (customer !== null && customer.disabledAt !== null) {
        await transaction.customerRegistrationGrant.update({
          where: { id: grant.id },
          data: { invalidatedAt: now, updatedAt: now },
        });
        return { kind: 'account_disabled' } as const;
      }
      if (customer === null) {
        customer = await transaction.customer.create({
          data: {
            mobile: grant.challenge.mobile,
            firstName: input.firstName,
            lastName: input.lastName,
            lastLoginAt: now,
            createdAt: now,
            updatedAt: now,
          },
        });
      } else {
        customer = await transaction.customer.update({
          where: { id: customer.id },
          data: { lastLoginAt: now, updatedAt: now },
        });
      }

      const credentials = await this.sessionCrypto.issue(customer.id, now);
      await transaction.customerRegistrationGrant.update({
        where: { id: grant.id },
        data: { consumedAt: now, updatedAt: now },
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
