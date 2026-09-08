'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { useAdminTheme } from '../admin-ui-provider';
import { useAuth } from '../auth/auth-provider';
import { loginDestination } from '../auth/return-destination';
import { LogoutButton } from '../components/logout-button';
import { classNames } from '../components/shared/class-names';
import { UiButton } from '../components/shared/ui-button';
import type { CatalogCapabilities, CatalogCapability } from './catalog-permissions';
import { catalogCapabilities } from './catalog-permissions';
import { CatalogState } from './catalog-state';

const CatalogCapabilityContext = createContext<CatalogCapabilities | null>(null);

const NAVIGATION = [
  { href: '/', label: 'خانه', icon: 'home' },
  { href: '/catalog/categories', label: 'دسته‌بندی‌ها', icon: 'categories' },
  { href: '/catalog/products', label: 'محصولات', icon: 'products' },
  { href: '/catalog/settings/price-display-unit', label: 'واحد نمایش قیمت', icon: 'settings' },
] as const;

function NavigationIcon({ name }: Readonly<{ name: (typeof NAVIGATION)[number]['icon'] }>) {
  const paths = {
    home: 'M3 10.8 12 3l9 7.8v9.7a.5.5 0 0 1-.5.5h-5.7v-6.2H9.2V21H3.5a.5.5 0 0 1-.5-.5z',
    categories: 'M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 0h6v6h-6z',
    products: 'm4 7.5 8-4 8 4v9l-8 4-8-4zm0 0 8 4 8-4M12 11.5v9',
    settings:
      'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Zm7-3.2 2-1.2-2-3.4-2.2.8a7.4 7.4 0 0 0-1.4-.8L15 5h-4l-.4 2.4c-.5.2-1 .5-1.4.8L7 7.4l-2 3.4L7 12v1.6l-2 1.2 2 3.4 2.2-.8c.4.3.9.6 1.4.8L11 21h4l.4-2.8c.5-.2 1-.5 1.4-.8l2.2.8 2-3.4-2-1.2z',
  } as const;
  return (
    <svg
      aria-hidden="true"
      className="size-5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  );
}

function isActivePath(pathname: string, href: string): boolean {
  if (href === '/') return pathname === href;
  if (href === '/catalog/products') {
    return pathname === href || pathname.startsWith('/catalog/products/');
  }
  return pathname === href;
}

interface CatalogShellViewProps {
  readonly pathname: string;
  readonly displayName: string;
  readonly email: string;
  readonly capabilities: CatalogCapabilities;
  readonly logoutSubmitting: boolean;
  readonly logoutMessage: string | null;
  readonly onLogout: () => void;
  readonly theme?: 'light' | 'dark';
  readonly onToggleTheme?: () => void;
  readonly children: ReactNode;
}

export function CatalogShellView({
  pathname,
  displayName,
  email,
  capabilities,
  logoutSubmitting,
  logoutMessage,
  onLogout,
  theme = 'light',
  onToggleTheme = () => undefined,
  children,
}: CatalogShellViewProps) {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const items = capabilities.read ? NAVIGATION : NAVIGATION.slice(0, 1);

  return (
    <div className="grid min-h-screen bg-admin-background p-3 sm:p-4 lg:p-5">
      <div className="min-h-full">
        <div className="grid min-h-full grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-admin-shell">
          {navigationOpen ? (
            <button
              type="button"
              className="fixed inset-0 z-30 bg-slate-950/25 backdrop-blur-xs lg:hidden"
              aria-label="بستن منوی کناری"
              onClick={() => setNavigationOpen(false)}
            />
          ) : null}
          <nav
            id="catalog-navigation"
            className={classNames(
              'fixed inset-y-3 right-0 z-40 flex w-68 flex-col rounded-l-2xl border border-border bg-surface p-4 shadow-navigation transition-transform duration-200 lg:static lg:inset-auto lg:w-auto lg:translate-x-0 lg:p-5',
              navigationOpen ? 'translate-x-0' : 'translate-x-full',
            )}
            aria-label="بخش‌های مدیریت"
            data-open={navigationOpen}
          >
            <div className="flex items-center gap-3 border-b border-border px-2 pb-4">
              <span className="grid size-11 place-items-center rounded-2xl bg-brand text-base font-black text-brand-ink shadow-brand-mark">
                EC
              </span>
              <div>
                <span className="m-0 text-sm font-black text-foreground">مدیریت فروشگاه</span>
              </div>
            </div>

            <ul className="m-0 grid list-none gap-1.5 p-0 pt-2">
              {items.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={classNames(
                        'flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold no-underline transition-colors',
                        active
                          ? 'bg-brand-soft/20 text-accent-foreground shadow-navigation-active'
                          : 'text-muted hover:bg-surface-muted hover:text-foreground',
                      )}
                      onClick={() => setNavigationOpen(false)}
                    >
                      <NavigationIcon name={item.icon} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-auto rounded-2xl bg-surface-muted p-3">
              <p className="m-0 text-xs font-bold text-foreground">پنل مدیریت پوشاک</p>
              <p className="m-0 mt-1 text-2xs leading-5 text-muted">
                مدیریت امن محصولات، دسته‌ها و تنظیمات فروشگاه
              </p>
            </div>
          </nav>

          <div className="grid min-w-0 grid-rows-workspace gap-3 bg-transparent sm:gap-4">
            <header className="flex min-h-19 items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 shadow-panel sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <UiButton
                  variant="secondary"
                  size="small"
                  className="lg:hidden"
                  aria-expanded={navigationOpen}
                  aria-controls="catalog-navigation"
                  onClick={() => setNavigationOpen((open) => !open)}
                >
                  فهرست بخش‌ها
                </UiButton>
                <div className="hidden min-w-0 sm:block">
                  <p className="m-0 text-xs text-muted">فضای کاری</p>
                  <p className="m-0 mt-1 truncate text-sm font-extrabold text-foreground">
                    مدیریت کاتالوگ
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <UiButton
                  variant="ghost"
                  size="small"
                  aria-label={theme === 'dark' ? 'فعال‌کردن حالت روشن' : 'فعال‌کردن حالت تیره'}
                  aria-pressed={theme === 'dark'}
                  onClick={onToggleTheme}
                >
                  <span aria-hidden="true">{theme === 'dark' ? '☀' : '◐'}</span>
                  <span className="hidden sm:inline">
                    {theme === 'dark' ? 'حالت روشن' : 'حالت تیره'}
                  </span>
                </UiButton>
                <div className="hidden min-w-0 border-r border-border pr-3 md:block">
                  <p className="m-0 max-w-44 truncate text-xs font-bold text-foreground">
                    {displayName || 'مدیر فروشگاه'}
                  </p>
                  <p className="m-0 mt-0.5 max-w-44 truncate text-2xs text-muted">
                    <bdi className="isolate direction-ltr">{email}</bdi>
                  </p>
                </div>
                <LogoutButton
                  submitting={logoutSubmitting}
                  message={logoutMessage}
                  onLogout={onLogout}
                />
              </div>
            </header>
            <main className="w-full min-w-0 rounded-2xl border border-border bg-surface p-4 shadow-panel sm:p-6 lg:p-8">
              <div className="w-full max-w-7xl">{children}</div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CatalogRouteBoundary({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const { state, logout } = useAuth();
  const { theme, setTheme } = useAdminTheme();

  useEffect(() => {
    if (state.phase === 'unauthenticated') router.replace(loginDestination(pathname));
  }, [pathname, router, state.phase]);

  if (state.phase === 'bootstrapping' || state.phase === 'unauthenticated') {
    return null;
  }
  if (state.phase === 'error') {
    return (
      <main className="grid min-h-screen place-items-center bg-admin-background p-4 sm:p-10">
        <CatalogState
          kind={state.kind === 'forbidden' ? 'forbidden' : 'error'}
          title={state.kind === 'forbidden' ? 'دسترسی مجاز نیست' : 'ورود به پنل ممکن نشد'}
          message={state.message}
          returnHref="/"
        />
      </main>
    );
  }

  const capabilities = catalogCapabilities(state.current.authorization.permissions);
  if (!capabilities.read) {
    return (
      <main className="grid min-h-screen place-items-center bg-admin-background p-4 sm:p-10">
        <CatalogState
          kind="forbidden"
          title="دسترسی به کاتالوگ مجاز نیست"
          message="مجوز مشاهده کاتالوگ برای حساب شما ثبت نشده است."
          returnHref="/"
          returnLabel="بازگشت به خانه مدیریت"
        />
      </main>
    );
  }

  return (
    <CatalogCapabilityContext.Provider value={capabilities}>
      <CatalogShellView
        pathname={pathname}
        displayName={state.current.admin.displayName}
        email={state.current.admin.email}
        capabilities={capabilities}
        logoutSubmitting={state.logout.submitting}
        logoutMessage={state.logout.message}
        onLogout={() => void logout().catch(() => undefined)}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      >
        {children}
      </CatalogShellView>
    </CatalogCapabilityContext.Provider>
  );
}

export function useCatalogCapabilities(): CatalogCapabilities {
  const value = useContext(CatalogCapabilityContext);
  if (!value) throw new Error('useCatalogCapabilities must be used within CatalogRouteBoundary.');
  return value;
}

interface RequireCatalogCapabilityProps {
  readonly capability: Exclude<CatalogCapability, 'read'>;
  readonly title: string;
  readonly children: ReactNode;
}

export function RequireCatalogCapability({
  capability,
  title,
  children,
}: RequireCatalogCapabilityProps) {
  const capabilities = useCatalogCapabilities();
  const allowed = capabilities[capability];
  if (allowed) return children;
  return (
    <CatalogState
      kind="forbidden"
      title={title}
      message="این حساب مجوز لازم برای انجام این کار را ندارد. دسترسی سمت سرور نیز مستقل بررسی می‌شود."
      returnHref="/catalog/products"
      returnLabel="بازگشت به محصولات"
    />
  );
}
