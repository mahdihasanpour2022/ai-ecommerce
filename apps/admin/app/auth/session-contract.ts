import type { CurrentAuthentication } from './auth-types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parseCurrentAuthentication(value: unknown): CurrentAuthentication | null {
  if (!isRecord(value) || !isRecord(value.admin) || !isRecord(value.authorization)) return null;
  const { admin, authorization } = value;
  if (
    typeof admin.id !== 'string' ||
    typeof admin.email !== 'string' ||
    typeof admin.displayName !== 'string' ||
    !Array.isArray(authorization.roles) ||
    !authorization.roles.every((role) => typeof role === 'string') ||
    !Array.isArray(authorization.permissions) ||
    !authorization.permissions.every((permission) => typeof permission === 'string')
  ) {
    return null;
  }
  return {
    admin: { id: admin.id, email: admin.email, displayName: admin.displayName },
    authorization: {
      roles: authorization.roles,
      permissions: authorization.permissions,
    },
  };
}
