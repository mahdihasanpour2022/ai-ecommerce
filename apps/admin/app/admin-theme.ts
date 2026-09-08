export const ADMIN_THEME_COOKIE = 'admin_theme';

export type AdminTheme = 'light' | 'dark';

export function parseAdminTheme(value: string | null | undefined): AdminTheme {
  return value === 'dark' ? 'dark' : 'light';
}
