import type { ReactNode } from 'react';

export function DocumentShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="fa-IR" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
