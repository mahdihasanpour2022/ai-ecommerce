'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth/auth-provider';
import { loginDestination } from './auth/return-destination';
import { StatusPanel } from './components/status-panel';
import { LogoutButton } from './components/logout-button';

export function ProtectedHome() {
  const router = useRouter();
  const { state, logout, retryBootstrap } = useAuth();

  useEffect(() => {
    if (state.phase === 'unauthenticated') router.replace(loginDestination('/'));
  }, [router, state.phase]);

  if (state.phase === 'bootstrapping' || state.phase === 'unauthenticated') {
    return (
      <StatusPanel
        busy
        title="در حال بررسی دسترسی"
        message="محتوای مدیریتی پس از تأیید نشست نمایش داده می‌شود."
      />
    );
  }

  if (state.phase === 'error') {
    return (
      <StatusPanel
        title={state.kind === 'forbidden' ? 'دسترسی مجاز نیست' : 'ورود به پنل ممکن نشد'}
        message={state.message}
        {...(state.recoverable ? { onRetry: retryBootstrap } : {})}
      />
    );
  }

  const { admin, authorization } = state.current;
  const canReadCatalog = authorization.permissions.includes('catalog.read');
  return (
    <div className="admin-shell">
      <header className="shell-header">
        <p className="shell-brand">پنل مدیریت فروشگاه</p>
        <div className="shell-session">
          <p className="shell-user">
            {admin.displayName} — <bdi className="ltr-value">{admin.email}</bdi>
          </p>
          <LogoutButton
            submitting={state.logout.submitting}
            message={state.logout.message}
            onLogout={() => void logout().catch(() => undefined)}
          />
        </div>
      </header>
      <main className="shell-main">
        <section className="shell-card" aria-labelledby="welcome-title">
          <p className="eyebrow">خانه مدیریت</p>
          <h1 id="welcome-title">خوش آمدید، {admin.displayName}</h1>
          <p>نشست شما تأیید شده است. قابلیت‌های مدیریتی در مراحل بعدی به این فضا افزوده می‌شوند.</p>
          <p className="permission-note">
            نمایش این صفحه جایگزین مجوز سمت سرور نیست؛ همه عملیات مدیریتی باید در API مجاز شوند.
          </p>
          {canReadCatalog ? (
            <Link className="primary-link" href="/catalog/products">
              ورود به مدیریت کاتالوگ
            </Link>
          ) : (
            <p className="permission-note">برای این حساب دسترسی مشاهده کاتالوگ ثبت نشده است.</p>
          )}
        </section>
      </main>
    </div>
  );
}
