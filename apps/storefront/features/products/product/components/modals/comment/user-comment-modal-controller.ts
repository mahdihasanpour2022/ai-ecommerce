import { Reoverlay } from 'reoverlay';

export const USER_COMMENT_MODAL_NAME = 'UserCommentModal';

export interface UserCommentProduct {
  readonly id: string;
  readonly name: string;
  readonly image: string;
  readonly alt: string;
}

export type UserCommentModalProps = {
  readonly product: UserCommentProduct;
};

// پنجره دیدگاه کاربر را از هر مصرف‌کننده‌ای نمایش می‌دهد.
export function showUserCommentModal(props: UserCommentModalProps): void {
  Reoverlay.showModal<UserCommentModalProps>(USER_COMMENT_MODAL_NAME, props);
}

// پنجره دیدگاه کاربر را بدون وابستگی به محل فراخوانی می‌بندد.
export function hideUserCommentModal(): void {
  Reoverlay.hideModal(USER_COMMENT_MODAL_NAME);
}
