'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from './auth/auth-provider';
import { loginDestination } from './auth/return-destination';
import { LogoutButton } from './components/logout-button';
import { StatusPanel } from './components/status-panel';

export function ProtectedHome() {
  const router = useRouter();
  const { state, logout } = useAuth();

  useEffect(() => {
    if (state.phase === 'unauthenticated') router.replace(loginDestination('/'));
  }, [router, state.phase]);

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
    <div className="min-h-screen bg-admin-background">
      <header className="flex flex-col items-start gap-4 border-b border-border bg-surface px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <p className="m-0 font-extrabold">پنل مدیریت فروشگاه</p>
        <div className="flex w-full flex-col items-start gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-center">
          <p className="!mb-0 text-sm text-muted">
            {admin.displayName ?? `${(<bdi className="isolate direction-ltr">{admin.email}</bdi>)}`}
          </p>
          <LogoutButton
            submitting={state.logout.submitting}
            message={state.logout.message}
            onLogout={() => void logout().catch(() => undefined)}
          />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl p-4 sm:p-8 lg:p-12">
        <section
          className="rounded-2xl border border-border bg-surface p-6 sm:p-10"
          aria-labelledby="welcome-title"
        >
          <p className="mb-2 mt-0 text-sm font-bold text-brand">صفحه اصلی</p>
          <h1 className="m-0 text-2xl font-bold leading-snug" id="welcome-title">
            خوش آمدید، {admin.displayName}
          </h1>
          <p className="leading-8 text-muted">
            نشست شما تأیید شده است. قابلیت‌های مدیریتی در مراحل بعدی به این فضا افزوده می‌شوند.
          </p>
          <p className="mt-6 rounded-xl bg-surface-subtle p-4 leading-8 text-muted">
            نمایش این صفحه جایگزین مجوز سمت سرور نیست؛ همه عملیات مدیریتی باید در API مجاز شوند.
          </p>
        </section>
      </main>
    </div>
  );
}
