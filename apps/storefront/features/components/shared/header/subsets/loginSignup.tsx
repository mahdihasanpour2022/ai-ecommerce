'use client';

import { Skeleton } from '@/components/shared';
import { UiButton, UiSelect, UiSpan } from '@/components/shared/ui';
import { AppRoutes } from '@/constants/appRoues';
import { useCustomerAuth } from '@/features/customer-auth/auth-provider';
import type { CustomerSnapshot } from '@/features/customer-auth/customer-auth';
import { useLogoutCustomer } from '@/features/customer-auth/customer-auth-hooks';
import loginIcon from '@/public/assets/login/login-icon.png';
import profileUsericon from '@/public/assets/login/profile-user-icon.webp';
import Image from 'next/image';
import { useRouter } from 'nextjs-toploader/app';
import { toast } from 'sonner';

const CUSTOMER_ICON_SIZES = '(min-width: 640px) 24px, 20px';

function AnonymousLogin() {
  const router = useRouter();

  return (
    <UiButton
      variant="style_7"
      className="border-foreground/20! flex h-11! items-center justify-center gap-2 rounded-xl border! px-4!"
      onClick={() => router.push(AppRoutes.auth, { scroll: false })}
    >
      <Image className="h-6 w-5" src={loginIcon} sizes={CUSTOMER_ICON_SIZES} alt="" />
      <UiSpan className="py-0! whitespace-nowrap" variant="style_1">
        ورود | ثبت نام
      </UiSpan>
    </UiButton>
  );
}

function UnavailableAccount() {
  return (
    <UiButton
      variant="style_7"
      aria-label="سرویس حساب کاربری موقتاً در دسترس نیست"
      className="border-foreground/20! flex h-11! items-center justify-start gap-1 rounded-xl border! px-2!"
      onClick={() => toast.warning('سرویس حساب کاربری موقتاً در دسترس نیست')}
    >
      <Image
        className="h-auto w-5 sm:w-6"
        src={profileUsericon}
        sizes={CUSTOMER_ICON_SIZES}
        alt=""
      />
      <UiSpan className="text-foreground/20! py-0! whitespace-nowrap" variant="style_1">
        ...
      </UiSpan>
    </UiButton>
  );
}

function AuthenticatedCustomerMenu({ customer }: Readonly<{ customer: CustomerSnapshot }>) {
  const logoutCustomer = useLogoutCustomer();

  return (
    <UiSelect className="w-full">
      <UiSelect.Trigger
        aria-label="بازکردن منوی حساب کاربری"
        className="border-foreground/20 flex h-11 w-full items-center justify-between gap-2 rounded-xl border px-2"
      >
        <Image
          className="h-auto w-5 sm:w-6"
          src={profileUsericon}
          sizes={CUSTOMER_ICON_SIZES}
          alt=""
        />
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="size-4 fill-current transition-transform"
        >
          <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" />
        </svg>
      </UiSelect.Trigger>
      <UiSelect.Content>
        <UiSelect.Label className="truncate">
          {customer.firstName} {customer.lastName}
        </UiSelect.Label>
        <UiSelect.Option
          value="logout"
          closeOnSelect={false}
          disabled={logoutCustomer.isPending}
          onSelect={() => logoutCustomer.mutate()}
          className="text-nice-red/80! text-xs! hover:bg-transparent!"
        >
          {logoutCustomer.isPending ? 'در حال خروج…' : 'خروج از حساب کاربری'}
        </UiSelect.Option>
      </UiSelect.Content>
    </UiSelect>
  );
}

const LoginSignup = () => {
  const { status, customer } = useCustomerAuth();
  let content = <Skeleton className="h-11 w-full rounded-xl" />;

  if (status === 'anonymous') content = <AnonymousLogin />;
  else if (status === 'unavailable') content = <UnavailableAccount />;
  else if (status === 'authenticated' && customer) {
    content = <AuthenticatedCustomerMenu customer={customer} />;
  }

  return <div className="h-full w-28!">{content}</div>;
};

export default LoginSignup;
