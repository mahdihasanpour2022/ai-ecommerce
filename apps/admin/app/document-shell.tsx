import type { ReactNode } from 'react';

export function DocumentShell({
  children,
  bodyClassName,
}: Readonly<{ children: ReactNode; bodyClassName?: string }>) {
  return (
    <html lang="fa-IR" dir="rtl">
      <body className={bodyClassName}>{children}</body>
    </html>
  );
}
