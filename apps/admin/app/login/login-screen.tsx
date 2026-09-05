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
    <main className="login-page">
      <section className="login-shell" aria-labelledby="login-title">
        <div className="login-panel">
          <div className="login-brand">
            <span className="login-brand-mark" aria-hidden="true">
              ن
            </span>
            <span>پنل مدیریت فروشگاه</span>
          </div>
          <div className="login-content">
            <h1 id="login-title">ورود به پنل مدیریت</h1>
            <p className="lead">برای مدیریت محصولات و سفارش‌ها وارد حساب خود شوید.</p>
            <LoginForm
              submitting={state.submitting}
              error={state.message}
              onSubmit={handleSubmit}
            />
          </div>
        </div>
        <aside className="login-showcase" aria-hidden="true">
          <div className="showcase-glow" />
          <div className="showcase-copy">
            <span className="showcase-badge">مدیریت یکپارچه</span>
            <h2>فروشگاهتان را با دیدی روشن مدیریت کنید</h2>
            <p>محصولات، موجودی و عملکرد فروش در یک فضای ساده و حرفه‌ای.</p>
          </div>
          <div className="dashboard-preview">
            <div className="preview-sidebar">
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="preview-content">
              <div className="preview-heading" />
              <div className="preview-stats">
                <span />
                <span />
                <span />
              </div>
              <div className="preview-chart">
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
