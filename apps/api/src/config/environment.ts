import { createPrivateKey, createPublicKey, type KeyObject } from 'node:crypto';

export const DEFAULT_API_PORT = 3002;

const RUNTIME_ENVIRONMENTS = ['development', 'test', 'production'] as const;
const DURATION_PATTERN = /^(\d+)(s|m|h|d)$/u;
const KID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/u;

export type RuntimeEnvironment = (typeof RUNTIME_ENVIRONMENTS)[number];

export interface AuthenticationEnvironment {
  readonly accessTokenTtlSeconds: number;
  readonly refreshTokenTtlSeconds: number;
  readonly refreshReuseGraceSeconds: number;
  readonly jwtPrivateKey: KeyObject;
  readonly jwtPublicKeys: ReadonlyMap<string, KeyObject>;
  readonly jwtActiveKid: string;
  readonly jwtIssuer: string;
  readonly jwtAudience: string;
  readonly corsAllowedOrigins: ReadonlySet<string>;
  readonly argon2MemoryKiB: number;
  readonly argon2TimeCost: number;
  readonly argon2Parallelism: number;
  readonly loginAccountFailureLimit: number;
  readonly loginWindowSeconds: number;
  readonly loginInitialDelaySeconds: number;
  readonly loginMaxDelaySeconds: number;
  readonly loginIpLimit: number;
  readonly loginThrottleHmacKey: Buffer;
  readonly csrfHmacKeys: ReadonlyMap<string, Buffer>;
  readonly csrfActiveKid: string;
  readonly refreshRecoveryKeys: ReadonlyMap<string, Buffer>;
  readonly refreshRecoveryActiveKid: string;
  readonly refreshSessionLimitPerMinute: number;
  readonly refreshIpLimitPerMinute: number;
}

export interface ApiEnvironment {
  readonly nodeEnv: RuntimeEnvironment;
  readonly port: number;
  readonly databaseUrl: string;
  readonly authentication: AuthenticationEnvironment;
}

type EnvironmentSource = Readonly<Record<string, string | undefined>>;

function invalid(name: string, expectation: string): never {
  throw new Error(`Invalid ${name}: ${expectation}.`);
}

function required(source: EnvironmentSource, name: string): string {
  const value = source[name];
  if (value === undefined || value.length === 0) invalid(name, 'a value is required');
  return value;
}

function parsePositiveInteger(
  value: string | undefined,
  name: string,
  defaultValue: number,
): number {
  const input = value ?? String(defaultValue);
  if (!/^[1-9]\d*$/u.test(input)) invalid(name, 'expected a positive base-10 integer');
  const parsed = Number(input);
  if (!Number.isSafeInteger(parsed)) invalid(name, 'expected a positive base-10 integer');
  return parsed;
}

function parseDuration(value: string | undefined, name: string, defaultValue: string): number {
  const input = value ?? defaultValue;
  const match = DURATION_PATTERN.exec(input);
  if (match === null) invalid(name, 'expected a positive duration such as 15m or 7d');
  const amount = Number(match[1]);
  if (!Number.isSafeInteger(amount) || amount < 1) {
    invalid(name, 'expected a positive duration such as 15m or 7d');
  }
  const unit = match[2];
  const multiplier = unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3600 : 86_400;
  const seconds = amount * multiplier;
  if (!Number.isSafeInteger(seconds)) invalid(name, 'duration is too large');
  return seconds;
}

function parseRuntimeEnvironment(value: string | undefined): RuntimeEnvironment {
  const environment = value ?? 'development';
  if (!RUNTIME_ENVIRONMENTS.some((candidate) => candidate === environment)) {
    invalid('NODE_ENV', 'expected development, test, or production');
  }
  return environment as RuntimeEnvironment;
}

function parsePort(value: string | undefined): number {
  const port = parsePositiveInteger(value, 'PORT', DEFAULT_API_PORT);
  if (port > 65_535) invalid('PORT', 'expected a base-10 integer from 1 through 65535');
  return port;
}

function parseDatabaseUrl(value: string | undefined): string {
  const input =
    value === undefined || value.length === 0
      ? invalid('DATABASE_URL', 'a PostgreSQL URL is required')
      : value;
  try {
    const url = new URL(input);
    if (
      !['postgres:', 'postgresql:'].includes(url.protocol) ||
      url.hostname.length === 0 ||
      url.pathname.length <= 1
    ) {
      throw new Error('invalid');
    }
  } catch {
    invalid('DATABASE_URL', 'expected a PostgreSQL URL');
  }
  return input;
}

function decodePem(value: string): string {
  return value.replaceAll('\\n', '\n');
}

function parseKeyConfiguration(source: EnvironmentSource): {
  privateKey: KeyObject;
  publicKeys: ReadonlyMap<string, KeyObject>;
  activeKid: string;
} {
  const activeKid = required(source, 'AUTH_JWT_ACTIVE_KID');
  if (!KID_PATTERN.test(activeKid))
    invalid('AUTH_JWT_ACTIVE_KID', 'expected 1-128 safe key-id characters');

  let privateKey: KeyObject;
  try {
    privateKey = createPrivateKey(decodePem(required(source, 'AUTH_JWT_PRIVATE_KEY')));
    if (privateKey.asymmetricKeyType !== 'ed25519') throw new Error('wrong key type');
  } catch {
    invalid('AUTH_JWT_PRIVATE_KEY', 'expected an Ed25519 PKCS#8 PEM private key');
  }

  let parsedRing: unknown;
  try {
    parsedRing = JSON.parse(required(source, 'AUTH_JWT_PUBLIC_KEYS')) as unknown;
  } catch {
    invalid('AUTH_JWT_PUBLIC_KEYS', 'expected a JSON object of Ed25519 SPKI PEM public keys');
  }
  if (parsedRing === null || Array.isArray(parsedRing) || typeof parsedRing !== 'object') {
    invalid('AUTH_JWT_PUBLIC_KEYS', 'expected a JSON object of Ed25519 SPKI PEM public keys');
  }

  const publicKeys = new Map<string, KeyObject>();
  for (const [kid, pem] of Object.entries(parsedRing as Record<string, unknown>)) {
    if (!KID_PATTERN.test(kid) || typeof pem !== 'string') {
      invalid(
        'AUTH_JWT_PUBLIC_KEYS',
        'expected safe key IDs mapped to Ed25519 SPKI PEM public keys',
      );
    }
    try {
      const key = createPublicKey(decodePem(pem));
      if (key.asymmetricKeyType !== 'ed25519') throw new Error('wrong key type');
      publicKeys.set(kid, key);
    } catch {
      invalid(
        'AUTH_JWT_PUBLIC_KEYS',
        'expected safe key IDs mapped to Ed25519 SPKI PEM public keys',
      );
    }
  }
  if (!publicKeys.has(activeKid))
    invalid('AUTH_JWT_ACTIVE_KID', 'must exist in AUTH_JWT_PUBLIC_KEYS');
  const activePublic = publicKeys.get(activeKid);
  if (activePublic === undefined || !activePublic.equals(createPublicKey(privateKey))) {
    invalid('AUTH_JWT_PRIVATE_KEY', 'must match the active public key');
  }
  return { privateKey, publicKeys, activeKid };
}

function parseOrigins(value: string | undefined): ReadonlySet<string> {
  const origins = required({ CORS_ALLOWED_ORIGINS: value }, 'CORS_ALLOWED_ORIGINS')
    .split(',')
    .map((origin) => origin.trim());
  if (origins.length === 0 || origins.some((origin) => origin.length === 0 || origin === '*')) {
    invalid('CORS_ALLOWED_ORIGINS', 'expected a comma-separated exact origin allowlist');
  }
  const result = new Set<string>();
  for (const origin of origins) {
    try {
      const url = new URL(origin);
      if (url.origin !== origin || !['http:', 'https:'].includes(url.protocol))
        throw new Error('invalid');
      result.add(origin);
    } catch {
      invalid('CORS_ALLOWED_ORIGINS', 'expected a comma-separated exact origin allowlist');
    }
  }
  return result;
}

function parseHmacKey(value: string | undefined): Buffer {
  const input = required({ AUTH_LOGIN_THROTTLE_HMAC_KEY: value }, 'AUTH_LOGIN_THROTTLE_HMAC_KEY');
  if (!/^[A-Za-z0-9+/]+={0,2}$/u.test(input)) {
    invalid('AUTH_LOGIN_THROTTLE_HMAC_KEY', 'expected base64 encoding of at least 32 random bytes');
  }
  const key = Buffer.from(input, 'base64');
  if (key.length < 32 || key.toString('base64').replace(/=+$/u, '') !== input.replace(/=+$/u, '')) {
    invalid('AUTH_LOGIN_THROTTLE_HMAC_KEY', 'expected base64 encoding of at least 32 random bytes');
  }
  return key;
}

function decodeBase64Key(value: unknown, name: string): Buffer {
  if (typeof value !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/u.test(value)) {
    invalid(name, 'expected base64 encoding of at least 32 random bytes');
  }
  const key = Buffer.from(value, 'base64');
  if (key.length < 32 || key.toString('base64').replace(/=+$/u, '') !== value.replace(/=+$/u, '')) {
    invalid(name, 'expected base64 encoding of at least 32 random bytes');
  }
  return key;
}

function parseCsrfKeyConfiguration(
  source: EnvironmentSource,
  loginThrottleHmacKey: Buffer,
): { keys: ReadonlyMap<string, Buffer>; activeKid: string } {
  const activeKid = required(source, 'AUTH_CSRF_ACTIVE_KID');
  if (!KID_PATTERN.test(activeKid)) {
    invalid('AUTH_CSRF_ACTIVE_KID', 'expected 1-128 safe key-id characters');
  }
  let parsedRing: unknown;
  try {
    parsedRing = JSON.parse(required(source, 'AUTH_CSRF_HMAC_KEYS')) as unknown;
  } catch {
    invalid('AUTH_CSRF_HMAC_KEYS', 'expected a JSON object of base64 HMAC keys');
  }
  if (parsedRing === null || Array.isArray(parsedRing) || typeof parsedRing !== 'object') {
    invalid('AUTH_CSRF_HMAC_KEYS', 'expected a JSON object of base64 HMAC keys');
  }
  const keys = new Map<string, Buffer>();
  const fingerprints = new Set<string>();
  for (const [kid, encodedKey] of Object.entries(parsedRing as Record<string, unknown>)) {
    if (!KID_PATTERN.test(kid)) {
      invalid('AUTH_CSRF_HMAC_KEYS', 'expected safe key IDs mapped to base64 HMAC keys');
    }
    const key = decodeBase64Key(encodedKey, 'AUTH_CSRF_HMAC_KEYS');
    const fingerprint = key.toString('base64');
    if (fingerprints.has(fingerprint) || key.equals(loginThrottleHmacKey)) {
      invalid('AUTH_CSRF_HMAC_KEYS', 'keys must be unique and independent');
    }
    fingerprints.add(fingerprint);
    keys.set(kid, key);
  }
  if (!keys.has(activeKid)) {
    invalid('AUTH_CSRF_ACTIVE_KID', 'must exist in AUTH_CSRF_HMAC_KEYS');
  }
  return { keys, activeKid };
}

function parseRecoveryKeyConfiguration(
  source: EnvironmentSource,
  independentKeys: readonly Buffer[],
): { keys: ReadonlyMap<string, Buffer>; activeKid: string } {
  let parsedRing: unknown;
  try {
    parsedRing = JSON.parse(required(source, 'AUTH_REFRESH_RECOVERY_KEYRING')) as unknown;
  } catch {
    invalid(
      'AUTH_REFRESH_RECOVERY_KEYRING',
      'expected JSON with activeKid and base64 AES-256-GCM keys',
    );
  }
  if (parsedRing === null || Array.isArray(parsedRing) || typeof parsedRing !== 'object') {
    invalid(
      'AUTH_REFRESH_RECOVERY_KEYRING',
      'expected JSON with activeKid and base64 AES-256-GCM keys',
    );
  }
  const record = parsedRing as Record<string, unknown>;
  if (
    Object.keys(record).sort().join(',') !== 'activeKid,keys' ||
    typeof record.activeKid !== 'string' ||
    !KID_PATTERN.test(record.activeKid) ||
    record.keys === null ||
    Array.isArray(record.keys) ||
    typeof record.keys !== 'object'
  ) {
    invalid(
      'AUTH_REFRESH_RECOVERY_KEYRING',
      'expected JSON with activeKid and base64 AES-256-GCM keys',
    );
  }
  const keys = new Map<string, Buffer>();
  const fingerprints = new Set<string>();
  for (const [kid, encodedKey] of Object.entries(record.keys as Record<string, unknown>)) {
    if (!KID_PATTERN.test(kid)) {
      invalid('AUTH_REFRESH_RECOVERY_KEYRING', 'expected safe key IDs mapped to 32-byte keys');
    }
    const key = decodeBase64Key(encodedKey, 'AUTH_REFRESH_RECOVERY_KEYRING');
    if (key.length !== 32) {
      invalid('AUTH_REFRESH_RECOVERY_KEYRING', 'expected exact 32-byte AES-256-GCM keys');
    }
    const fingerprint = key.toString('base64');
    if (
      fingerprints.has(fingerprint) ||
      independentKeys.some((candidate) => candidate.equals(key))
    ) {
      invalid('AUTH_REFRESH_RECOVERY_KEYRING', 'keys must be unique and independent');
    }
    fingerprints.add(fingerprint);
    keys.set(kid, key);
  }
  if (!keys.has(record.activeKid)) {
    invalid('AUTH_REFRESH_RECOVERY_KEYRING', 'activeKid must exist in keys');
  }
  return { keys, activeKid: record.activeKid };
}

function parseAuthentication(source: EnvironmentSource): AuthenticationEnvironment {
  const keys = parseKeyConfiguration(source);
  const accessTokenTtlSeconds = parseDuration(source.ACCESS_TOKEN_TTL, 'ACCESS_TOKEN_TTL', '15m');
  const refreshTokenTtlSeconds = parseDuration(source.REFRESH_TOKEN_TTL, 'REFRESH_TOKEN_TTL', '7d');
  if (refreshTokenTtlSeconds <= accessTokenTtlSeconds) {
    invalid('REFRESH_TOKEN_TTL', 'must exceed ACCESS_TOKEN_TTL');
  }
  const loginInitialDelaySeconds = parsePositiveInteger(
    source.AUTH_LOGIN_INITIAL_DELAY_SECONDS,
    'AUTH_LOGIN_INITIAL_DELAY_SECONDS',
    30,
  );
  const loginMaxDelaySeconds = parsePositiveInteger(
    source.AUTH_LOGIN_MAX_DELAY_SECONDS,
    'AUTH_LOGIN_MAX_DELAY_SECONDS',
    900,
  );
  if (loginInitialDelaySeconds > loginMaxDelaySeconds) {
    invalid('AUTH_LOGIN_INITIAL_DELAY_SECONDS', 'must not exceed AUTH_LOGIN_MAX_DELAY_SECONDS');
  }
  const argon2MemoryKiB = parsePositiveInteger(
    source.AUTH_ARGON2_MEMORY_KIB,
    'AUTH_ARGON2_MEMORY_KIB',
    65_536,
  );
  const argon2TimeCost = parsePositiveInteger(
    source.AUTH_ARGON2_TIME_COST,
    'AUTH_ARGON2_TIME_COST',
    3,
  );
  if (argon2MemoryKiB < 65_536) invalid('AUTH_ARGON2_MEMORY_KIB', 'must be at least 65536');
  if (argon2TimeCost < 3) invalid('AUTH_ARGON2_TIME_COST', 'must be at least 3');
  const jwtIssuer = source.AUTH_JWT_ISSUER ?? 'automotive-commerce-api';
  const jwtAudience = source.AUTH_JWT_AUDIENCE ?? 'automotive-commerce-admin';
  if (jwtIssuer.length === 0) invalid('AUTH_JWT_ISSUER', 'expected a non-empty exact issuer');
  if (jwtAudience.length === 0) invalid('AUTH_JWT_AUDIENCE', 'expected a non-empty exact audience');
  const loginThrottleHmacKey = parseHmacKey(source.AUTH_LOGIN_THROTTLE_HMAC_KEY);
  const csrfKeys = parseCsrfKeyConfiguration(source, loginThrottleHmacKey);
  const recoveryKeys = parseRecoveryKeyConfiguration(source, [
    loginThrottleHmacKey,
    ...csrfKeys.keys.values(),
  ]);
  return Object.freeze({
    accessTokenTtlSeconds,
    refreshTokenTtlSeconds,
    refreshReuseGraceSeconds: parsePositiveInteger(
      source.REFRESH_REUSE_GRACE_SECONDS,
      'REFRESH_REUSE_GRACE_SECONDS',
      10,
    ),
    jwtPrivateKey: keys.privateKey,
    jwtPublicKeys: keys.publicKeys,
    jwtActiveKid: keys.activeKid,
    jwtIssuer,
    jwtAudience,
    corsAllowedOrigins: parseOrigins(source.CORS_ALLOWED_ORIGINS),
    argon2MemoryKiB,
    argon2TimeCost,
    argon2Parallelism: parsePositiveInteger(
      source.AUTH_ARGON2_PARALLELISM,
      'AUTH_ARGON2_PARALLELISM',
      1,
    ),
    loginAccountFailureLimit: parsePositiveInteger(
      source.AUTH_LOGIN_ACCOUNT_FAILURE_LIMIT,
      'AUTH_LOGIN_ACCOUNT_FAILURE_LIMIT',
      5,
    ),
    loginWindowSeconds: parsePositiveInteger(
      source.AUTH_LOGIN_WINDOW_SECONDS,
      'AUTH_LOGIN_WINDOW_SECONDS',
      900,
    ),
    loginInitialDelaySeconds,
    loginMaxDelaySeconds,
    loginIpLimit: parsePositiveInteger(source.AUTH_LOGIN_IP_LIMIT, 'AUTH_LOGIN_IP_LIMIT', 20),
    loginThrottleHmacKey,
    csrfHmacKeys: csrfKeys.keys,
    csrfActiveKid: csrfKeys.activeKid,
    refreshRecoveryKeys: recoveryKeys.keys,
    refreshRecoveryActiveKid: recoveryKeys.activeKid,
    refreshSessionLimitPerMinute: parsePositiveInteger(
      source.AUTH_REFRESH_SESSION_LIMIT_PER_MINUTE,
      'AUTH_REFRESH_SESSION_LIMIT_PER_MINUTE',
      10,
    ),
    refreshIpLimitPerMinute: parsePositiveInteger(
      source.AUTH_REFRESH_IP_LIMIT_PER_MINUTE,
      'AUTH_REFRESH_IP_LIMIT_PER_MINUTE',
      30,
    ),
  });
}

export function parseEnvironment(source: EnvironmentSource = process.env): ApiEnvironment {
  return Object.freeze({
    nodeEnv: parseRuntimeEnvironment(source.NODE_ENV),
    port: parsePort(source.PORT),
    databaseUrl: parseDatabaseUrl(source.DATABASE_URL),
    authentication: parseAuthentication(source),
  });
}
