'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { loginSchema } from '../login/login-schema';
import type { LoginValues } from '../login/login-schema';

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
  });
  const submit = handleSubmit(async (values) => {
    resetField('password');
    await props.onSubmit(values);
  });

  return (
    <form className="login-form" noValidate onSubmit={(event) => void submit(event)}>
      <div className="field">
        <label htmlFor="identifier">ایمیل یا نام کاربری</label>
        <input
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
          <p id="identifier-error" className="field-error" role="alert">
            {errors.identifier.message}
          </p>
        ) : null}
        <p id="identifier-help" className="field-hint">
          نام کاربری باید ۳ تا ۲۰ کاراکتر و فقط شامل حروف انگلیسی، عدد یا _ باشد.
        </p>
      </div>
      <div className="field">
        <label htmlFor="password">گذرواژه</label>
        <input
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
          <p id="password-error" className="field-error" role="alert">
            {errors.password.message}
          </p>
        ) : null}
        <p id="password-help" className="field-hint">
          رمز عبور باید دقیقاً ۶ رقم انگلیسی باشد.
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
