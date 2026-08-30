'use client';

import type { FormEvent } from 'react';

interface LoginFormProps {
  readonly email: string;
  readonly password: string;
  readonly submitting: boolean;
  readonly error: string | null;
  readonly onEmailChange: (value: string) => void;
  readonly onPasswordChange: (value: string) => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function LoginForm(props: LoginFormProps) {
  return (
    <form className="login-form" onSubmit={props.onSubmit} aria-describedby="login-help">
      <div className="field">
        <label htmlFor="email">ایمیل</label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          dir="ltr"
          required
          maxLength={254}
          value={props.email}
          onChange={(event) => props.onEmailChange(event.target.value)}
          disabled={props.submitting}
        />
      </div>
      <div className="field">
        <label htmlFor="password">گذرواژه</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={props.password}
          onChange={(event) => props.onPasswordChange(event.target.value)}
          disabled={props.submitting}
        />
        <p id="login-help" className="field-hint">
          اطلاعات ورود فقط برای برقراری نشست امن ارسال می‌شود.
        </p>
      </div>
      {props.error ? (
        <p id="login-error" className="form-error" role="alert" tabIndex={-1}>
          {props.error}
        </p>
      ) : null}
      <button
        className="primary-button"
        type="submit"
        disabled={props.submitting}
        aria-busy={props.submitting}
      >
        {props.submitting ? 'در حال ورود…' : 'ورود به پنل مدیریت'}
      </button>
    </form>
  );
}
