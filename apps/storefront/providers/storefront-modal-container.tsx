'use client';

import { GUEST_FAVORITE_MODAL_NAME } from '@/features/products/product/components/modals/favorite/guest-favorite-modal-controller';
import { GuestFavoriteModal } from '@/features/products/product/components/modals/favorite/guest-favorite-modal';
import { ModalContainer, Reoverlay } from 'reoverlay';

import { GUEST_COMMENT_MODAL_NAME } from '@/features/products/product/components/modals/comment/guest-comment-modal-controller';
import { GuestCommentModal } from '@/features/products/product/components/modals/comment/guest-comment-modal';

import { USER_COMMENT_MODAL_NAME } from '@/features/products/product/components/modals/comment/user-comment-modal-controller';
import { UserCommentModal } from '@/features/products/product/components/modals/comment/user-comment-modal';

Reoverlay.config([
  { name: GUEST_FAVORITE_MODAL_NAME, component: GuestFavoriteModal },
  { name: GUEST_COMMENT_MODAL_NAME, component: GuestCommentModal },
  { name: USER_COMMENT_MODAL_NAME, component: UserCommentModal },
]);

// تنها Container سراسری Storefront را برای Modalهای نام‌دار فراهم می‌کند.
export function StorefrontModalContainer() {
  return <ModalContainer />;
}
