'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '../auth/auth-provider';
import { safeReturnDestination } from '../auth/return-destination';
import { LoginForm } from '../components/login-form';
import { StatusPanel } from '../components/status-panel';
import type { LoginValues } from './login-schema';

export function LoginScreen({ returnTo }: Readonly<{ returnTo: string | null }>) {
  const router = useRouter();
  const { state, login } = useAuth();
  const destination = safeReturnDestination(returnTo);

  useEffect(() => {
    if (state.phase === 'authenticated') router.replace(destination);
  }, [destination, router, state.phase]);

  useEffect(() => {
    if (state.phase === 'unauthenticated' && state.message) {
      document.getElementById('login-error')?.focus();
    }
  }, [state]);

  async function handleSubmit(values: LoginValues) {
    if (state.phase !== 'unauthenticated' || state.submitting) return;
    try {
      await login(values.identifier, values.password);
    } catch {
      // The provider exposes only the safe, localized failure state.
    }
  }

  if (state.phase === 'bootstrapping' || state.phase === 'authenticated') return null;
  if (state.phase === 'error') {
    return <StatusPanel title="ورود به پنل ممکن نشد" message={state.message} />;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-admin-background p-0 sm:p-8">
      <section
        className="grid min-h-screen w-full max-w-6xl grid-cols-1 overflow-hidden bg-surface shadow-panel md:min-h-168 md:grid-cols-2 md:rounded-3xl md:border md:border-border"
        aria-labelledby="login-title"
      >
        <div className="flex min-w-0 flex-col p-6 sm:p-10 lg:p-12">
          <div className="flex items-center gap-3 text-sm font-extrabold text-foreground">
            <span
              className="grid size-8 place-items-center rounded-xl bg-brand text-white shadow-brand-mark"
              aria-hidden="true"
            >
              ن
            </span>
            <span>پنل مدیریت فروشگاه</span>
          </div>
          <div className="my-auto w-full max-w-sm py-8">
            <h1 className="m-0 text-2xl font-bold leading-snug tracking-tight" id="login-title">
              ورود به پنل مدیریت
            </h1>
            <p className="mb-0 mt-2 text-sm leading-8 text-muted">
              برای مدیریت محصولات و سفارش‌ها وارد حساب خود شوید.
            </p>
            <LoginForm
              submitting={state.submitting}
              error={state.message}
              onSubmit={handleSubmit}
            />
          </div>
        </div>
        <aside
          className="relative hidden min-w-0 flex-col justify-center overflow-hidden bg-brand p-12 text-brand-ink md:flex lg:p-16"
          aria-hidden="true"
        >
          <div className="max-w-lg">
            <span className="inline-flex rounded-full border border-white/30 bg-white/15 px-3 py-1.5 text-xs font-bold">
              مدیریت یکپارچه
            </span>
            <h2 className="mb-0 mt-3 text-3xl font-black leading-relaxed lg:text-4xl">
              فروشگاهتان را با دیدی روشن مدیریت کنید
            </h2>
            <p className="mb-0 mt-3 max-w-md text-sm leading-8 text-brand-ink/80">
              محصولات، موجودی و عملکرد فروش در یک فضای ساده و حرفه‌ای.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
