export const PROTECTED_HOME = '/';
const SAFE_RETURN_DESTINATIONS = new Set([PROTECTED_HOME, '/categories']);

export function safeReturnDestination(value: string | null | undefined): string {
  return value !== undefined && value !== null && SAFE_RETURN_DESTINATIONS.has(value)
    ? value
    : PROTECTED_HOME;
}

export function loginDestination(returnTo: string): string {
  const safe = safeReturnDestination(returnTo);
  return `/login?returnTo=${encodeURIComponent(safe)}`;
}
