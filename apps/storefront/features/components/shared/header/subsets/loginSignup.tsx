'use client';

import { UiButton, UiSpan } from '@/components/shared/ui';
import loginIcon from '@/public/assets/login/login-icon.png';
import Image from 'next/image';
import { useRouter } from 'nextjs-toploader/app';

const LoginSignup = () => {
  const router = useRouter();
  const authHandler = () => {
    router.push(`/auth`, { scroll: false });
  };

  return (
    <div className="">
      <UiButton
        variant="style_7"
        className="border-foreground/20! flex items-center justify-center gap-2 rounded-xl border! px-4!"
        onClick={() => authHandler()}
      >
        <Image
          className="h-6 w-5 sm:w-5"
          src={loginIcon}
          width={200}
          height={200}
          alt="login-icon"
        />
        <UiSpan className="whitespace-nowrap" variant="style_1">
          ورود | ثبت نام
        </UiSpan>
      </UiButton>
    </div>
  );
};

export default LoginSignup;
