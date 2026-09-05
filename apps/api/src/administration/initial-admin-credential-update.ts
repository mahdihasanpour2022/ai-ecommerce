import type { PrismaClient } from '../generated/prisma/client.js';
import {
  isValidAdminPassword,
  isValidAdminUsername,
  normalizeAdminUsername,
} from './admin-credential-policy.js';
import { hashAdminPassword } from './super-admin-provisioning.js';

const UPDATE_ADVISORY_LOCK_KEY = 7_361_340_400_000_002n;
const LEGACY_USERNAME_PATTERN = /^legacy_[a-f0-9]{13}$/u;

export type CredentialUpdateErrorCode = 'INVALID_INPUT' | 'ADMIN_STATE_INVALID' | 'ALREADY_UPDATED';

export class CredentialUpdateError extends Error {
  constructor(
    readonly code: CredentialUpdateErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'CredentialUpdateError';
  }
}

export interface InitialCredentialUpdateInput {
  readonly username: string;
  readonly password: string;
}

export interface InitialCredentialUpdateEnvironmentInput {
  readonly ADMIN_CREDENTIAL_USERNAME?: string | undefined;
  readonly ADMIN_CREDENTIAL_PASSWORD?: string | undefined;
  readonly ADMIN_CREDENTIAL_PASSWORD_CONFIRM?: string | undefined;
}

function invalidInput(): never {
  throw new CredentialUpdateError('INVALID_INPUT', 'Invalid credential update input.');
}

export function parseInitialCredentialUpdateInput(
  environment: InitialCredentialUpdateEnvironmentInput,
): InitialCredentialUpdateInput {
  const usernameValue = environment.ADMIN_CREDENTIAL_USERNAME;
  const password = environment.ADMIN_CREDENTIAL_PASSWORD;
  const confirmation = environment.ADMIN_CREDENTIAL_PASSWORD_CONFIRM;
  if (usernameValue === undefined || password === undefined || confirmation === undefined) {
    invalidInput();
  }

  const username = normalizeAdminUsername(usernameValue);
  if (!isValidAdminUsername(username) || !isValidAdminPassword(password)) invalidInput();
  if (password !== confirmation) invalidInput();
  return { username, password };
}

export async function updateInitialAdminCredentials(
  prisma: PrismaClient,
  input: InitialCredentialUpdateInput,
): Promise<void> {
  const passwordHash = await hashAdminPassword(input.password);
  const now = new Date();

  await prisma.$transaction(
    async (transaction) => {
      await transaction.$queryRaw`
        SELECT pg_advisory_xact_lock(${UPDATE_ADVISORY_LOCK_KEY})::text AS lock_result
      `;
      const admins = await transaction.adminUser.findMany({
        select: { id: true, username: true },
        orderBy: { id: 'asc' },
        take: 2,
      });
      if (admins.length !== 1) {
        throw new CredentialUpdateError(
          'ADMIN_STATE_INVALID',
          'Exactly one initial Admin is required.',
        );
      }
      const admin = admins[0];
      if (admin === undefined) {
        throw new CredentialUpdateError('ADMIN_STATE_INVALID', 'Initial Admin is unavailable.');
      }
      if (!LEGACY_USERNAME_PATTERN.test(admin.username)) {
        throw new CredentialUpdateError(
          'ALREADY_UPDATED',
          'Initial Admin credentials have already been updated.',
        );
      }

      await transaction.adminUser.update({
        where: { id: admin.id },
        data: { username: input.username, passwordHash },
      });
      await transaction.authSession.updateMany({
        where: { adminUserId: admin.id, revokedAt: null },
        data: { revokedAt: now },
      });
      await transaction.refreshToken.updateMany({
        where: { session: { adminUserId: admin.id }, revokedAt: null },
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
        where: { session: { adminUserId: admin.id } },
        data: {
          recoveryCiphertext: null,
          recoveryNonce: null,
          recoveryAuthTag: null,
          recoveryKeyId: null,
          recoveryExpiresAt: null,
        },
      });
    },
    { maxWait: 10_000, timeout: 15_000 },
  );
}
