import { Reoverlay } from 'reoverlay';

export const GUEST_COMMENT_MODAL_NAME = 'GuestCommentModal';

// پنجره دیدگاه مهمان را از هر مصرف‌کننده‌ای نمایش می‌دهد.
export function showGuestCommentModal(): void {
  Reoverlay.showModal(GUEST_COMMENT_MODAL_NAME);
}

// پنجره دیدگاه مهمان را بدون وابستگی به محل فراخوانی می‌بندد.
export function hideGuestCommentModal(): void {
  Reoverlay.hideModal(GUEST_COMMENT_MODAL_NAME);
}
