'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '../../auth/auth-provider';
import { safeReturnDestination } from '../../auth/return-destination';
import { StatusPanel } from '../../components/status-panel';
import { LoginForm } from './login-form';
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
    <main className="grid min-h-screen items-start bg-surface p-0 md:place-items-center md:bg-login-page md:p-6 lg:p-8">
      <section
        className="grid min-h-screen w-full grid-cols-1 border-0 bg-surface shadow-none md:min-h-login-shell md:max-w-login-shell md:grid-cols-login-shell md:overflow-hidden md:rounded-3xl md:border md:border-border md:shadow-login-shell"
        aria-labelledby="login-title"
      >
        <div className="flex min-h-screen min-w-0 flex-col p-6 sm:p-10 md:min-h-0 lg:p-12">
          <div className="flex items-center gap-3 text-sm font-extrabold text-foreground">
            <span
              className="grid size-8 place-items-center rounded-xl bg-login-mark text-white shadow-login-mark"
              aria-hidden="true"
            >
              ن
            </span>
            <span>پنل مدیریت فروشگاه</span>
          </div>
          <div className="my-auto w-full max-w-sm py-8">
            <h1
              className="m-0 text-2xl font-bold leading-snug tracking-tight lg:text-3xl"
              id="login-title"
            >
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
          className="relative hidden min-w-0 flex-col justify-center overflow-hidden bg-login-showcase p-8 text-white isolate md:flex lg:p-16"
          aria-hidden="true"
        >
          <div className="absolute -top-32 -right-44 -z-10 size-128 rounded-full border border-white/15 shadow-login-glow" />
          <div className="max-w-lg">
            <span className="inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-bold">
              مدیریت یکپارچه
            </span>
            <h2 className="mb-0 mt-3 text-3xl font-black leading-relaxed lg:text-4xl">
              فروشگاهتان را مدیریت کنید
            </h2>
            <p className="mb-0 mt-3 max-w-md text-sm leading-8 text-white/80">
              محصولات، موجودی و عملکرد فروش در یک فضای ساده و حرفه‌ای.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
