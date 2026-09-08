import type { ReactNode } from 'react';
import type { AdminTheme } from './admin-theme';

export function DocumentShell({
  children,
  bodyClassName,
  theme = 'light',
}: Readonly<{ children: ReactNode; bodyClassName?: string; theme?: AdminTheme }>) {
  return (
    <html lang="fa-IR" dir="rtl" data-theme={theme} style={{ colorScheme: theme }}>
      <body cz-shortcut-listen="true" className={bodyClassName}>
        {children}
      </body>
    </html>
  );
}
