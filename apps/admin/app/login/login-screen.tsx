'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../auth/auth-provider';
import { safeReturnDestination } from '../auth/return-destination';
import { LoginForm } from '../components/login-form';
import { StatusPanel } from '../components/status-panel';

export function LoginScreen({ returnTo }: Readonly<{ returnTo: string | null }>) {
  const router = useRouter();
  const { state, login, retryBootstrap } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const destination = safeReturnDestination(returnTo);

  useEffect(() => {
    if (state.phase === 'authenticated') router.replace(destination);
  }, [destination, router, state.phase]);

  useEffect(() => {
    if (state.phase === 'unauthenticated' && state.message) {
      document.getElementById('login-error')?.focus();
    }
  }, [state]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.phase !== 'unauthenticated' || state.submitting) return;
    const submittedPassword = password;
    setPassword('');
    try {
      await login(email.trim(), submittedPassword);
    } catch {
      // The provider exposes only the safe, localized failure state.
    }
  }

  if (state.phase === 'bootstrapping' || state.phase === 'authenticated') {
    return <StatusPanel busy title="در حال بررسی نشست" message="لطفاً چند لحظه منتظر بمانید." />;
  }

  if (state.phase === 'error') {
    return (
      <StatusPanel
        title={state.kind === 'forbidden' ? 'دسترسی مجاز نیست' : 'بررسی نشست انجام نشد'}
        message={state.message}
        {...(state.recoverable ? { onRetry: retryBootstrap } : {})}
      />
    );
  }

  return (
    <main className="centered-page">
      <section className="auth-card" aria-labelledby="login-title">
        <p className="eyebrow">پنل مدیریت فروشگاه</p>
        <h1 id="login-title">ورود مدیر</h1>
        <p className="lead">برای ادامه، ایمیل و گذرواژه حساب مدیریتی خود را وارد کنید.</p>
        <LoginForm
          email={email}
          password={password}
          submitting={state.submitting}
          error={state.message}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onSubmit={handleSubmit}
        />
      </section>
    </main>
  );
}
