'use client';

import {
  GUEST_FAVORITE_MODAL_NAME,
  GuestFavoriteModal,
} from '@/features/favorite/guest-favorite-modal';
import { ModalContainer, Reoverlay } from 'reoverlay';

import {
  GUEST_COMMENT_MODAL_NAME,
  GuestCommentModal,
} from '@/features/comment/guest-comment-modal';

import { USER_COMMENT_MODAL_NAME, UserCommentModal } from '@/features/comment/user-comment-modal';

Reoverlay.config([
  { name: GUEST_FAVORITE_MODAL_NAME, component: GuestFavoriteModal },
  { name: GUEST_COMMENT_MODAL_NAME, component: GuestCommentModal },
  { name: USER_COMMENT_MODAL_NAME, component: UserCommentModal },
]);

// تنها Container سراسری Storefront را برای Modalهای نام‌دار فراهم می‌کند.
export function StorefrontModalContainer() {
  return <ModalContainer />;
}

// Modal ورود مهمان را با نام ثابت ثبت‌شده نمایش می‌دهد.
export function showGuestFavoriteModal(): void {
  Reoverlay.showModal(GUEST_FAVORITE_MODAL_NAME);
}
export function showGuestCommentModal(): void {
  Reoverlay.showModal(GUEST_COMMENT_MODAL_NAME);
}

export function showUserCommentModal(): void {
  Reoverlay.showModal(USER_COMMENT_MODAL_NAME);
}
