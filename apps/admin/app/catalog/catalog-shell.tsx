'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../auth/auth-provider';
import { loginDestination } from '../auth/return-destination';
import { LogoutButton } from '../components/logout-button';
import { CatalogState } from './catalog-state';
import { catalogCapabilities } from './catalog-permissions';
import type { CatalogCapabilities, CatalogCapability } from './catalog-permissions';

const CatalogCapabilityContext = createContext<CatalogCapabilities | null>(null);

const NAVIGATION = [
  { href: '/', label: 'خانه' },
  { href: '/catalog/categories', label: 'دسته‌بندی‌ها' },
  { href: '/catalog/products', label: 'محصولات' },
  { href: '/catalog/settings/price-display-unit', label: 'واحد نمایش قیمت' },
] as const;

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
  children,
}: CatalogShellViewProps) {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const items = capabilities.read ? NAVIGATION : NAVIGATION.slice(0, 1);

  return (
    <div className="admin-shell catalog-shell">
      <header className="shell-header catalog-header">
        <div>
          <p className="shell-brand">پنل مدیریت فروشگاه</p>
          <p className="shell-user">
            {displayName} — <bdi className="ltr-value">{email}</bdi>
          </p>
        </div>
        <div className="catalog-header-actions">
          <button
            className="secondary-button catalog-navigation-toggle"
            type="button"
            aria-expanded={navigationOpen}
            aria-controls="catalog-navigation"
            onClick={() => setNavigationOpen((open) => !open)}
          >
            فهرست بخش‌ها
          </button>
          <LogoutButton submitting={logoutSubmitting} message={logoutMessage} onLogout={onLogout} />
        </div>
      </header>
      <div className="catalog-shell-body">
        <nav
          id="catalog-navigation"
          className="catalog-navigation"
          aria-label="بخش‌های مدیریت"
          data-open={navigationOpen}
        >
          <ul>
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActivePath(pathname, item.href) ? 'page' : undefined}
                  onClick={() => setNavigationOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <main className="catalog-content">{children}</main>
      </div>
    </div>
  );
}

export function CatalogRouteBoundary({ children }: Readonly<{ children: ReactNode }>) {
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
      <main className="centered-page">
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
      <main className="centered-page">
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
