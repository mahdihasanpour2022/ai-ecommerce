export const PROTECTED_HOME = '/';

const ALLOWED_RETURN_DESTINATIONS = new Set([PROTECTED_HOME]);
const FORBIDDEN_CHARACTERS = /[\\\u0000-\u001f\u007f]/;

export function safeReturnDestination(value: string | null | undefined): string {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    FORBIDDEN_CHARACTERS.test(value) ||
    !ALLOWED_RETURN_DESTINATIONS.has(value)
  ) {
    return PROTECTED_HOME;
  }
  return value;
}

export function loginDestination(returnTo: string): string {
  const safe = safeReturnDestination(returnTo);
  return `/login?returnTo=${encodeURIComponent(safe)}`;
}
