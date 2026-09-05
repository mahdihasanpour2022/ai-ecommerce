export const ADMIN_USERNAME_MIN_LENGTH = 3;
export const ADMIN_USERNAME_MAX_LENGTH = 20;
export const ADMIN_USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/u;
export const ADMIN_PASSWORD_PATTERN = /^[0-9]{6}$/u;

export function normalizeAdminEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidAdminEmail(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value) &&
    !containsControlCharacter(value)
  );
}

export function normalizeAdminUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidAdminUsername(value: string): boolean {
  return ADMIN_USERNAME_PATTERN.test(value);
}

export function isValidAdminPassword(value: string): boolean {
  return ADMIN_PASSWORD_PATTERN.test(value);
}

export function containsControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && (codePoint < 32 || (codePoint >= 127 && codePoint <= 159));
  });
}
