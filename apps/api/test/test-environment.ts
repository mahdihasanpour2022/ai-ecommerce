import { generateKeyPairSync } from 'node:crypto';

import {
  parseEnvironment,
  type ApiEnvironment,
  type RuntimeEnvironment,
} from '../src/config/environment';

const keyPair = generateKeyPairSync('ed25519');
const privateKey = keyPair.privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
const publicKey = keyPair.publicKey.export({ format: 'pem', type: 'spki' }).toString();

export function validEnvironmentSource(
  overrides: Readonly<Record<string, string | undefined>> = {},
): Record<string, string | undefined> {
  return {
    NODE_ENV: 'test',
    DATABASE_URL:
      process.env.TEST_DATABASE_URL ??
      'postgresql://automotive:automotive_local_only@localhost:5432/automotive_test?schema=public',
    AUTH_JWT_PRIVATE_KEY: privateKey,
    AUTH_JWT_PUBLIC_KEYS: JSON.stringify({ 'test-key': publicKey }),
    AUTH_JWT_ACTIVE_KID: 'test-key',
    CORS_ALLOWED_ORIGINS: 'http://localhost:3001',
    AUTH_LOGIN_THROTTLE_HMAC_KEY: Buffer.alloc(32, 7).toString('base64'),
    ...overrides,
  };
}

export function createTestEnvironment(
  nodeEnv: RuntimeEnvironment = 'test',
  overrides: Readonly<Record<string, string | undefined>> = {},
): ApiEnvironment {
  return parseEnvironment(validEnvironmentSource({ NODE_ENV: nodeEnv, ...overrides }));
}
