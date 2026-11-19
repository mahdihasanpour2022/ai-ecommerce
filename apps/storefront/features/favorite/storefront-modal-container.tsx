'use client';

import { ModalContainer, Reoverlay } from 'reoverlay';
import {
  GUEST_FAVORITE_MODAL_NAME,
  GuestFavoriteModal,
} from './guest-favorite-modal';

Reoverlay.config([{ name: GUEST_FAVORITE_MODAL_NAME, component: GuestFavoriteModal }]);

// تنها Container سراسری Storefront را برای Modalهای نام‌دار فراهم می‌کند.
export function StorefrontModalContainer() {
  return <ModalContainer />;
}

// Modal ورود مهمان را با نام ثابت ثبت‌شده نمایش می‌دهد.
export function showGuestFavoriteModal(): void {
  Reoverlay.showModal(GUEST_FAVORITE_MODAL_NAME);
}
