import * as argon2 from 'argon2';

import type { PrismaClient } from '../generated/prisma/client.js';

export const SUPER_ADMIN_ROLE_CODE = 'SUPER_ADMIN';
export const ADMIN_ACCESS_PERMISSION_CODE = 'admin.access';

const BOOTSTRAP_ADVISORY_LOCK_KEY = 7_361_340_400_000_001n;
const MINIMUM_PASSWORD_CHARACTERS = 15;
const MAXIMUM_PASSWORD_CHARACTERS = 128;

export const ARGON2_OPTIONS = Object.freeze({
  type: argon2.argon2id,
  version: 0x13,
  memoryCost: 65_536,
  timeCost: 3,
  parallelism: 1,
  hashLength: 32,
});

export type ProvisioningErrorCode =
  'INVALID_INPUT' | 'ALREADY_PROVISIONED' | 'REFERENCE_DATA_INVALID';

export class ProvisioningError extends Error {
  constructor(
    readonly code: ProvisioningErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ProvisioningError';
  }
}

export interface SuperAdminInput {
  email: string;
  displayName: string;
  password: string;
}

export interface SuperAdminEnvironmentInput {
  ADMIN_BOOTSTRAP_EMAIL?: string | undefined;
  ADMIN_BOOTSTRAP_DISPLAY_NAME?: string | undefined;
  ADMIN_BOOTSTRAP_PASSWORD?: string | undefined;
  ADMIN_BOOTSTRAP_PASSWORD_CONFIRM?: string | undefined;
}

function characterLength(value: string): number {
  return Array.from(value).length;
}

function containsControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && (codePoint < 32 || (codePoint >= 127 && codePoint <= 159));
  });
}

function invalidInput(field: string): never {
  throw new ProvisioningError('INVALID_INPUT', `Invalid provisioning input: ${field}.`);
}

export function parseSuperAdminInput(environment: SuperAdminEnvironmentInput): SuperAdminInput {
  const emailValue = environment.ADMIN_BOOTSTRAP_EMAIL;
  const displayNameValue = environment.ADMIN_BOOTSTRAP_DISPLAY_NAME;
  const password = environment.ADMIN_BOOTSTRAP_PASSWORD;
  const passwordConfirmation = environment.ADMIN_BOOTSTRAP_PASSWORD_CONFIRM;

  if (emailValue === undefined) invalidInput('email');
  if (displayNameValue === undefined) invalidInput('display name');
  if (password === undefined) invalidInput('password');
  if (passwordConfirmation === undefined) invalidInput('password confirmation');

  const email = emailValue.trim().toLowerCase();
  const displayName = displayNameValue.trim();

  if (
    email.length === 0 ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email) ||
    containsControlCharacter(email)
  ) {
    invalidInput('email');
  }

  if (
    displayName.length === 0 ||
    characterLength(displayName) > 120 ||
    containsControlCharacter(displayName)
  ) {
    invalidInput('display name');
  }

  const passwordLength = characterLength(password);
  if (
    passwordLength < MINIMUM_PASSWORD_CHARACTERS ||
    passwordLength > MAXIMUM_PASSWORD_CHARACTERS
  ) {
    invalidInput('password length');
  }

  if (password !== passwordConfirmation) invalidInput('password confirmation');

  return { email, displayName, password };
}

export async function hashAdminPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function provisionFirstSuperAdmin(
  prisma: PrismaClient,
  input: SuperAdminInput,
): Promise<void> {
  const passwordHash = await hashAdminPassword(input.password);

  await prisma.$transaction(
    async (transaction) => {
      await transaction.$queryRaw`
        SELECT pg_advisory_xact_lock(${BOOTSTRAP_ADVISORY_LOCK_KEY})::text AS lock_result
      `;

      if ((await transaction.adminUser.count()) !== 0) {
        throw new ProvisioningError(
          'ALREADY_PROVISIONED',
          'Initial Admin provisioning has already completed.',
        );
      }

      const role = await transaction.role.findUnique({
        where: { code: SUPER_ADMIN_ROLE_CODE },
        select: {
          id: true,
          permissions: {
            where: { permission: { code: ADMIN_ACCESS_PERMISSION_CODE } },
            select: { permissionId: true },
          },
        },
      });

      if (role === null || role.permissions.length !== 1) {
        throw new ProvisioningError(
          'REFERENCE_DATA_INVALID',
          'Required authorization reference data is unavailable.',
        );
      }

      await transaction.adminUser.create({
        data: {
          email: input.email,
          displayName: input.displayName,
          passwordHash,
          roles: { create: { roleId: role.id } },
        },
      });
    },
    { maxWait: 10_000, timeout: 15_000 },
  );
}
