import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client.js';
import {
  parseSuperAdminInput,
  provisionFirstSuperAdmin,
  ProvisioningError,
  type SuperAdminEnvironmentInput,
} from './super-admin-provisioning.js';

const PASSWORD_VARIABLES = [
  'ADMIN_BOOTSTRAP_PASSWORD',
  'ADMIN_BOOTSTRAP_PASSWORD_CONFIRM',
] as const;

export interface CliIo {
  stdout(message: string): void;
  stderr(message: string): void;
}

export interface CliOptions {
  argv: readonly string[];
  environment: NodeJS.ProcessEnv;
  io: CliIo;
  provision?: (
    databaseUrl: string,
    input: ReturnType<typeof parseSuperAdminInput>,
  ) => Promise<void>;
}

function requireDatabaseUrl(environment: NodeJS.ProcessEnv): string {
  const value = environment.DATABASE_URL;
  if (value === undefined || value.length === 0) {
    throw new ProvisioningError('INVALID_INPUT', 'DATABASE_URL is required.');
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
    throw new ProvisioningError('INVALID_INPUT', 'DATABASE_URL is invalid.');
  }

  return value;
}

function consumeEnvironmentInput(environment: NodeJS.ProcessEnv): SuperAdminEnvironmentInput {
  const input: SuperAdminEnvironmentInput = {
    ADMIN_BOOTSTRAP_EMAIL: environment.ADMIN_BOOTSTRAP_EMAIL,
    ADMIN_BOOTSTRAP_USERNAME: environment.ADMIN_BOOTSTRAP_USERNAME,
    ADMIN_BOOTSTRAP_DISPLAY_NAME: environment.ADMIN_BOOTSTRAP_DISPLAY_NAME,
    ADMIN_BOOTSTRAP_PASSWORD: environment.ADMIN_BOOTSTRAP_PASSWORD,
    ADMIN_BOOTSTRAP_PASSWORD_CONFIRM: environment.ADMIN_BOOTSTRAP_PASSWORD_CONFIRM,
  };

  for (const variable of PASSWORD_VARIABLES) delete environment[variable];

  return input;
}

async function provisionUsingDatabase(
  databaseUrl: string,
  input: ReturnType<typeof parseSuperAdminInput>,
): Promise<void> {
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    await provisionFirstSuperAdmin(prisma, input);
  } finally {
    await prisma.$disconnect();
  }
}

function safeFailureMessage(error: unknown): string {
  if (error instanceof ProvisioningError) {
    switch (error.code) {
      case 'INVALID_INPUT':
        return 'Provisioning failed: required input is invalid.';
      case 'ALREADY_PROVISIONED':
        return 'Provisioning failed: an Admin already exists.';
      case 'REFERENCE_DATA_INVALID':
        return 'Provisioning failed: required authorization data is unavailable.';
    }
  }

  return 'Provisioning failed: database operation failed.';
}

export async function runCreateSuperAdminCli(options: CliOptions): Promise<number> {
  const environmentInput = consumeEnvironmentInput(options.environment);

  try {
    if (options.argv.length !== 0) {
      throw new ProvisioningError('INVALID_INPUT', 'Command arguments are not accepted.');
    }

    const input = parseSuperAdminInput(environmentInput);
    const databaseUrl = requireDatabaseUrl(options.environment);

    await (options.provision ?? provisionUsingDatabase)(databaseUrl, input);
    options.io.stdout('First Super Admin provisioned successfully.');
    return 0;
  } catch (error) {
    options.io.stderr(safeFailureMessage(error));
    return 1;
  }
}
