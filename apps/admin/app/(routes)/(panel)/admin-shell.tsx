'use client';
import { nanoid } from 'nanoid';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useAuth } from '../../auth/auth-provider';
import { loginDestination } from '../../auth/return-destination';
import { LogoutButton } from '../../components/logout-button';
import { classNames } from '../../components/shared/class-names';
import { StatusPanel } from '../../components/status-panel';
import { ThemeToggle } from '../../components/theme-toggle';

const routes = [
  { name: 'صفحه اصلی', href: '/' },
  { name: 'دسته‌بندی‌ها', href: '/categories' },
  { name: 'محصولات', href: '/products' },
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
      className="bg-admin-background flex min-h-screen flex-col gap-5 p-5"
      data-testid="admin-shell"
    >
      <header className="bg-surface shadow-panel flex flex-col items-start gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="mb-0 text-base font-extrabold">پنل مدیریت فروشگاه</h1>
        <div className="flex w-full flex-col items-start gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-center">
          <p className="text-muted mb-0 text-sm">
            {admin.displayName ?? <bdi className="direction-ltr isolate">{admin.email}</bdi>}
          </p>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LogoutButton
              submitting={state.logout.submitting}
              message={state.logout.message}
              onLogout={() => void logout().catch(() => undefined)}
            />
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-5 lg:flex-row">
        <aside
          className="bg-surface shadow-panel w-full rounded-2xl p-5 lg:w-64"
          aria-label="نوار کناری پنل مدیریت"
        >
          <nav aria-label="ناوبری پنل مدیریت">
            {routes.map((route) => (
              <Link
                key={nanoid()}
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

        <main className="bg-surface shadow-panel min-w-0 flex-1 rounded-2xl p-5">{children}</main>
      </div>
    </div>
  );
}
