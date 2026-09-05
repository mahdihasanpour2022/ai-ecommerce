import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client.js';
import {
  CredentialUpdateError,
  parseInitialCredentialUpdateInput,
  updateInitialAdminCredentials,
  type InitialCredentialUpdateEnvironmentInput,
} from './initial-admin-credential-update.js';

const PASSWORD_VARIABLES = [
  'ADMIN_CREDENTIAL_PASSWORD',
  'ADMIN_CREDENTIAL_PASSWORD_CONFIRM',
] as const;

export interface CredentialUpdateCliIo {
  stdout(message: string): void;
  stderr(message: string): void;
}

export interface CredentialUpdateCliOptions {
  argv: readonly string[];
  environment: NodeJS.ProcessEnv;
  io: CredentialUpdateCliIo;
  update?: (
    databaseUrl: string,
    input: ReturnType<typeof parseInitialCredentialUpdateInput>,
  ) => Promise<void>;
}

function requireDatabaseUrl(environment: NodeJS.ProcessEnv): string {
  const value = environment.DATABASE_URL;
  if (value === undefined || value.length === 0) {
    throw new CredentialUpdateError('INVALID_INPUT', 'DATABASE_URL is required.');
  }
  try {
    const url = new URL(value);
    if (
      !['postgres:', 'postgresql:'].includes(url.protocol) ||
      url.hostname.length === 0 ||
      url.pathname.length <= 1
    ) {
      throw new Error('Unsupported database URL.');
    }
  } catch {
    throw new CredentialUpdateError('INVALID_INPUT', 'DATABASE_URL is invalid.');
  }
  return value;
}

function consumeInput(environment: NodeJS.ProcessEnv): InitialCredentialUpdateEnvironmentInput {
  const input = {
    ADMIN_CREDENTIAL_USERNAME: environment.ADMIN_CREDENTIAL_USERNAME,
    ADMIN_CREDENTIAL_PASSWORD: environment.ADMIN_CREDENTIAL_PASSWORD,
    ADMIN_CREDENTIAL_PASSWORD_CONFIRM: environment.ADMIN_CREDENTIAL_PASSWORD_CONFIRM,
  };
  for (const variable of PASSWORD_VARIABLES) delete environment[variable];
  return input;
}

async function updateUsingDatabase(
  databaseUrl: string,
  input: ReturnType<typeof parseInitialCredentialUpdateInput>,
): Promise<void> {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  try {
    await updateInitialAdminCredentials(prisma, input);
  } finally {
    await prisma.$disconnect();
  }
}

function safeFailureMessage(error: unknown): string {
  if (error instanceof CredentialUpdateError) {
    switch (error.code) {
      case 'INVALID_INPUT':
        return 'Credential update failed: required input is invalid.';
      case 'ADMIN_STATE_INVALID':
        return 'Credential update failed: initial Admin state is invalid.';
      case 'ALREADY_UPDATED':
        return 'Credential update failed: initial credentials were already updated.';
    }
  }
  return 'Credential update failed: database operation failed.';
}

export async function runUpdateInitialAdminCredentialsCli(
  options: CredentialUpdateCliOptions,
): Promise<number> {
  const input = consumeInput(options.environment);
  try {
    if (options.argv.length !== 0) {
      throw new CredentialUpdateError('INVALID_INPUT', 'Command arguments are not accepted.');
    }
    const parsed = parseInitialCredentialUpdateInput(input);
    const databaseUrl = requireDatabaseUrl(options.environment);
    await (options.update ?? updateUsingDatabase)(databaseUrl, parsed);
    options.io.stdout('Initial Admin credentials updated successfully.');
    return 0;
  } catch (error) {
    options.io.stderr(safeFailureMessage(error));
    return 1;
  }
}
