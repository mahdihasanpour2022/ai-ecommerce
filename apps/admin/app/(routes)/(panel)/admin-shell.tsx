'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useAuth } from '../../auth/auth-provider';
import { loginDestination } from '../../auth/return-destination';
import { LogoutButton } from '../../components/logout-button';
import { classNames } from '../../components/shared/class-names';
import { StatusPanel } from '../../components/status-panel';

const routes = [
  { name: 'صفحه اصلی', href: '/' },
  { name: 'مدیریت دسته‌بندی‌ها', href: '/categories' },
] as const;

export function ProtectedAdminShell({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const { state, logout } = useAuth();

  useEffect(() => {
    if (state.phase === 'unauthenticated') router.replace(loginDestination(pathname));
  }, [pathname, router, state.phase]);

  if (state.phase === 'bootstrapping' || state.phase === 'unauthenticated') {
    return null;
  }

  if (state.phase === 'error') {
    return (
      <StatusPanel
        title={state.kind === 'forbidden' ? 'دسترسی مجاز نیست' : 'ورود به پنل ممکن نشد'}
        message={state.message}
      />
    );
  }

  const { admin } = state.current;

  return (
    <div
      className="flex min-h-screen flex-col gap-5 bg-admin-background p-5"
      data-testid="admin-shell"
    >
      <header className="flex flex-col items-start gap-4 rounded-2xl bg-surface p-5 shadow-panel sm:flex-row sm:items-center sm:justify-between">
        <h1 className="mb-0 text-base font-extrabold">پنل مدیریت فروشگاه</h1>
        <div className="flex w-full flex-col items-start gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-center">
          <p className="mb-0 text-sm text-muted">
            {admin.displayName ?? <bdi className="isolate direction-ltr">{admin.email}</bdi>}
          </p>
          <LogoutButton
            submitting={state.logout.submitting}
            message={state.logout.message}
            onLogout={() => void logout().catch(() => undefined)}
          />
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-5 lg:flex-row">
        <aside
          className="w-full rounded-2xl bg-surface p-5 shadow-panel lg:w-64"
          aria-label="نوار کناری پنل مدیریت"
        >
          <nav aria-label="ناوبری پنل مدیریت">
            {routes.map((route) => (
              <Link
                key={route.href}
                className={classNames(
                  'flex min-h-11 items-center rounded-xl px-3 py-2.5 font-bold no-underline transition-colors',
                  pathname === route.href ? 'text-brand' : 'text-muted',
                )}
                href={route.href}
                aria-current={pathname === route.href ? 'page' : undefined}
              >
                {route.name}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 rounded-2xl bg-surface p-5 shadow-panel">{children}</main>
      </div>
    </div>
  );
}
