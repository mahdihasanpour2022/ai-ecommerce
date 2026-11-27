import { Reoverlay } from 'reoverlay';

export const USER_COMMENT_MODAL_NAME = 'UserCommentModal';

// پنجره دیدگاه کاربر را از هر مصرف‌کننده‌ای نمایش می‌دهد.
export function showUserCommentModal(): void {
  Reoverlay.showModal(USER_COMMENT_MODAL_NAME);
}

// پنجره دیدگاه کاربر را بدون وابستگی به محل فراخوانی می‌بندد.
export function hideUserCommentModal(): void {
  Reoverlay.hideModal(USER_COMMENT_MODAL_NAME);
}
