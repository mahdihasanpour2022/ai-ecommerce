export const DEFAULT_API_PORT = 3002;

const RUNTIME_ENVIRONMENTS = ['development', 'test', 'production'] as const;

export type RuntimeEnvironment = (typeof RUNTIME_ENVIRONMENTS)[number];

export interface ApiEnvironment {
  readonly nodeEnv: RuntimeEnvironment;
  readonly port: number;
}

type EnvironmentSource = Readonly<Record<string, string | undefined>>;

function isRuntimeEnvironment(value: string): value is RuntimeEnvironment {
  return RUNTIME_ENVIRONMENTS.some((candidate) => candidate === value);
}

function parseRuntimeEnvironment(value: string | undefined): RuntimeEnvironment {
  const environment = value ?? 'development';

  if (!isRuntimeEnvironment(environment)) {
    throw new Error('Invalid NODE_ENV: expected development, test, or production.');
  }

  return environment;
}

function parsePort(value: string | undefined): number {
  if (value === undefined) {
    return DEFAULT_API_PORT;
  }

  if (!/^[1-9]\d*$/.test(value)) {
    throw new Error('Invalid PORT: expected a base-10 integer from 1 through 65535.');
  }

  const port = Number(value);

  if (!Number.isSafeInteger(port) || port > 65535) {
    throw new Error('Invalid PORT: expected a base-10 integer from 1 through 65535.');
  }

  return port;
}

export function parseEnvironment(source: EnvironmentSource = process.env): ApiEnvironment {
  return Object.freeze({
    nodeEnv: parseRuntimeEnvironment(source.NODE_ENV),
    port: parsePort(source.PORT),
  });
}
