'use client';

import { UiButton, UiHeading, UiInputTextField, UiP } from '@/components/shared/ui';
import { useRegisterCustomer } from '@/features/customer-auth/customer-auth-hooks';
import {
  customerRegistrationSchema,
  sanitizeCustomerNameInput,
  type CustomerRegistrationFormInput,
  type CustomerRegistrationFormValues,
} from '@/features/customer-auth/customer-registration';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRef } from 'react';
import { useForm } from 'react-hook-form';

// فرم تکمیل ثبت‌نام را فقط به grant معتبر نگهبان مسیر و mutation اختصاصی متصل می‌کند.
export default function RegisterAuthPage() {
  const registerCustomer = useRegisterCustomer();
  const submissionInFlight = useRef(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CustomerRegistrationFormInput, unknown, CustomerRegistrationFormValues>({
    resolver: zodResolver(customerRegistrationSchema),
    defaultValues: { firstName: '', lastName: '' },
  });
  const firstNameRegistration = register('firstName');
  const lastNameRegistration = register('lastName');
  const isBusy = isSubmitting || registerCustomer.isPending;

  // قفل حافظه‌ای از ثبت دوباره با کلیک یا Enter هم‌زمان جلوگیری می‌کند و مقادیر خطاپذیر را نگه می‌دارد.
  const submitRegistration = async ({ firstName, lastName }: CustomerRegistrationFormValues) => {
    if (submissionInFlight.current) return;
    submissionInFlight.current = true;
    try {
      await registerCustomer.mutateAsync({ firstName, lastName });
    } catch {
      // پیام امن خطا از state استاندارد mutation نمایش داده می‌شود.
    } finally {
      submissionInFlight.current = false;
    }
  };

  return (
    <main dir="rtl" className="bg-background flex min-h-dvh items-center justify-center p-4 sm:p-6">
      <section
        aria-labelledby="registration-heading"
        className="border-border bg-surface w-full max-w-md rounded-xl border p-6 shadow-sm sm:p-8"
      >
        <UiHeading id="registration-heading" className="text-foreground text-center">
           ثبت‌نام
        </UiHeading>
        <UiP className="text-muted mt-2 text-center">نام و نام خانوادگی خود را وارد کنید.</UiP>

        <form
          className="mt-8 space-y-6"
          noValidate
          onSubmit={(event) => void handleSubmit(submitRegistration)(event)}
        >
          <UiInputTextField
            {...firstNameRegistration}
            id="first-name"
            type="text"
            label="نام"
            required
            autoComplete="given-name"
            autoFocus
            dir="rtl"
            className="auth-name-input"
            errorMessage={errors.firstName?.message}
            onChange={(event) => {
              event.currentTarget.value = sanitizeCustomerNameInput(event.currentTarget.value);
              void firstNameRegistration.onChange(event);
            }}
          />
          <UiInputTextField
            {...lastNameRegistration}
            id="last-name"
            type="text"
            label="نام خانوادگی"
            required
            autoComplete="family-name"
            dir="rtl"
            className="auth-name-input"
            errorMessage={errors.lastName?.message}
            onChange={(event) => {
              event.currentTarget.value = sanitizeCustomerNameInput(event.currentTarget.value);
              void lastNameRegistration.onChange(event);
            }}
          />

          {registerCustomer.error ? (
            <UiP role="alert" className="text-danger">
              {registerCustomer.error.message}
            </UiP>
          ) : null}

          <UiButton type="submit" size="medium" loading={isBusy} className="bg-nice-red text-white">
            {isBusy ? 'در حال تکمیل ثبت‌نام' : 'تکمیل ثبت‌نام'}
          </UiButton>
        </form>
      </section>
    </main>
  );
}
