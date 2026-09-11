'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { UiButton } from '../../components/shared/ui-button';
import type { LoginValues } from './login-schema';
import { loginSchema } from './login-schema';

interface LoginFormProps {
  readonly submitting: boolean;
  readonly error: string | null;
  readonly onSubmit: (values: LoginValues) => Promise<void>;
}

export function LoginForm(props: LoginFormProps) {
  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
    shouldFocusError: true,
    mode: 'onChange',
  });
  const submit = handleSubmit(async (values) => {
    resetField('password');
    await props.onSubmit(values);
  });

  return (
    <form className="mt-6 grid gap-4" noValidate onSubmit={(event) => void submit(event)}>
      <div className="grid gap-2">
        <label className="text-sm font-bold" htmlFor="identifier">
          ایمیل یا نام کاربری
        </label>
        <input
          className="min-h-12 w-full rounded-xl border border-slate-400 bg-white px-3 py-2.5 text-slate-900 focus:border-brand focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          id="identifier"
          type="text"
          autoComplete="username"
          dir="ltr"
          required
          maxLength={254}
          placeholder="admin@example.com یا admin_user"
          aria-invalid={errors.identifier ? 'true' : 'false'}
          aria-describedby={
            errors.identifier ? 'identifier-error identifier-help' : 'identifier-help'
          }
          disabled={props.submitting}
          {...register('identifier')}
        />
        {errors.identifier ? (
          <p id="identifier-error" className="m-0 text-xs leading-7 text-danger" role="alert">
            {errors.identifier.message}
          </p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <label className="text-sm font-bold" htmlFor="password">
          رمز
        </label>
        <input
          className="min-h-12 w-full rounded-xl border border-slate-400 bg-white px-3 py-2.5 text-slate-900 focus:border-brand focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          id="password"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          required
          minLength={6}
          maxLength={6}
          pattern="[0-9]{6}"
          placeholder="رمز عبور ۶ رقمی"
          aria-invalid={errors.password ? 'true' : 'false'}
          aria-describedby={errors.password ? 'password-error password-help' : 'password-help'}
          disabled={props.submitting}
          {...register('password')}
        />
        {errors.password ? (
          <p id="password-error" className="m-0 text-xs leading-7 text-danger" role="alert">
            {errors.password.message}
          </p>
        ) : null}
      </div>
      {props.error ? (
        <p
          id="login-error"
          className="m-0 rounded-lg border-s-4 border-danger bg-red-50 px-4 py-3 leading-7 text-red-900 dark:bg-red-950/30 dark:text-red-200"
          role="alert"
          tabIndex={-1}
        >
          {props.error}
        </p>
      ) : null}
      <UiButton
        className="w-full"
        type="submit"
        disabled={props.submitting}
        aria-busy={props.submitting}
      >
        {props.submitting ? 'در حال ورود…' : 'ورود'}
      </UiButton>
    </form>
  );
}
