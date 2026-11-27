'use client';

import { UiButton, UiHeading, UiP } from '@/components/shared/ui';
import {
  customerAuthDestination,
  safeReturnDestination,
} from '@/features/customer-auth/customer-auth';
import { useRouter } from 'next/navigation';
import { ModalWrapper, Reoverlay } from 'reoverlay';
import { useEffect, useRef } from 'react';

export const GUEST_FAVORITE_MODAL_NAME = 'GuestFavoriteModal';

// پنجره نام‌دار مهمان را بدون وابستگی به محل فراخوانی می‌بندد.
export function hideGuestFavoriteModal(): void {
  Reoverlay.hideModal(GUEST_FAVORITE_MODAL_NAME);
}

// پنجره ورود، focus اولیه، گردش keyboard و بازگشت focus را مدیریت می‌کند.
export function GuestFavoriteModal() {
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement>(null);
  const loginButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    triggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    loginButtonRef.current?.focus();

    // گردش Tab را داخل محتوای Modal نگه می‌دارد چون Wrapper پکیج focus trap داخلی ندارد.
    const trapKeyboardFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const focusableElements = contentRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusableElements?.length) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    };

    document.addEventListener('keydown', trapKeyboardFocus);
    return () => {
      document.removeEventListener('keydown', trapKeyboardFocus);
      triggerRef.current?.focus();
    };
  }, []);

  // URL جاری را دوباره پالایش می‌کند و پس از بستن Modal با replace وارد Auth می‌شود.
  const goToLogin = () => {
    const returnTo = safeReturnDestination(
      `${window.location.pathname}${window.location.search}${window.location.hash}`,
    );
    hideGuestFavoriteModal();
    router.replace(customerAuthDestination(returnTo));
  };

  return (
    <ModalWrapper
      aria-labelledby="guest-favorite-title"
      aria-describedby="guest-favorite-description"
      animation="zoom"
      wrapperClassName="p-4 sm:p-6"
      contentContainerClassName="border-border bg-surface! text-foreground w-full max-w-md rounded-2xl border p-6 shadow-lg sm:p-8"
      onClose={hideGuestFavoriteModal}
    >
      <div ref={contentRef} dir="rtl">
        <div className="flex items-start justify-between gap-4">
          <UiHeading id="guest-favorite-title" type="h2">
            ورود به حساب کاربری
          </UiHeading>
          <UiButton
            type="button"
            variant="style_9"
            size="icon"
            className="w-fit! shrink-0 text-xl"
            aria-label="بستن پنجره ورود"
            onClick={hideGuestFavoriteModal}
          >
            ×
          </UiButton>
        </div>
        <UiP id="guest-favorite-description" className="text-muted mt-4 leading-7">
          برای افزودن این محصول به لیست علاقه‌مندی‌ها ابتدا باید وارد سایت شوید.
        </UiP>
        <UiButton
          ref={loginButtonRef}
          type="button"
          size="medium"
          className="bg-nice-red mt-6 text-white"
          onClick={goToLogin}
        >
          ورود به سایت
        </UiButton>
      </div>
    </ModalWrapper>
  );
}
