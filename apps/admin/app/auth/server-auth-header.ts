import type { CurrentAuthentication } from './auth-types';
import { parseCurrentAuthentication } from './session-contract';

export const AUTH_STATE_HEADER = 'x-e-commerce-admin-auth-state';

export function encodeAuthenticationHeader(current: CurrentAuthentication): string {
  return Buffer.from(JSON.stringify(current), 'utf8').toString('base64url');
}

export function decodeAuthenticationHeader(value: string | null): CurrentAuthentication | null {
  if (value === null || value.length > 16_384 || !/^[A-Za-z0-9_-]+$/u.test(value)) return null;
  try {
    return parseCurrentAuthentication(
      JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as unknown,
    );
  } catch {
    return null;
  }
}
