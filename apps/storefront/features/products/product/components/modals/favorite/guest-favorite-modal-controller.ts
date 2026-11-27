import { Reoverlay } from 'reoverlay';

export const GUEST_FAVORITE_MODAL_NAME = 'GuestFavoriteModal';

// پنجره علاقه‌مندی مهمان را از هر مصرف‌کننده‌ای نمایش می‌دهد.
export function showGuestFavoriteModal(): void {
  Reoverlay.showModal(GUEST_FAVORITE_MODAL_NAME);
}

// پنجره علاقه‌مندی مهمان را بدون وابستگی به محل فراخوانی می‌بندد.
export function hideGuestFavoriteModal(): void {
  Reoverlay.hideModal(GUEST_FAVORITE_MODAL_NAME);
}
