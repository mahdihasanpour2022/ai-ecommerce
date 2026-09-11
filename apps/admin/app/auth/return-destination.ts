export const PROTECTED_HOME = '/';

export function safeReturnDestination(_value: string | null | undefined): string {
  void _value;
  return PROTECTED_HOME;
}

export function loginDestination(returnTo: string): string {
  const safe = safeReturnDestination(returnTo);
  return `/login?returnTo=${encodeURIComponent(safe)}`;
}
