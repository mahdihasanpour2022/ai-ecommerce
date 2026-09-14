'use client';

import { useAdminTheme } from '../admin-ui-provider';
import { UiButton } from './shared/ui-button';
import { MoonIcon, SunIcon } from './shared/ui-icons';

export function ThemeToggle() {
  const { setTheme, theme } = useAdminTheme();
  const dark = theme === 'dark';
  const accessibleName = dark ? 'فعال‌کردن حالت روشن' : 'فعال‌کردن حالت تاریک';

  return (
    <UiButton
      variant="theme"
      size="icon"
      className="rounded-full w-9! h-9!"
      aria-label={accessibleName}
      aria-pressed={dark}
      title={accessibleName}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
    >
      {dark ? (
        <SunIcon className="size-4 transition-transform duration-200" />
      ) : (
        <MoonIcon className="size-4 transition-transform duration-200" />
      )}
    </UiButton>
  );
}
