'use client';

import { useRQDeleter } from '../../../hooks/rq_hooks/useRQDeleter';
import type { DeleteBannerResponse } from '../interfaces/banner-contract';
import { bannerKeys } from './useGetBanners';

export function useDeleteBanner() {
  return useRQDeleter<DeleteBannerResponse, string>({
    mutationKey: ['banners', 'delete'],
    request: {
      method: 'delete',
      url: (bannerId) => `/admin/catalog/banners/${encodeURIComponent(bannerId)}`,
    },
    invalidateQueryKeys: [bannerKeys.all],
  });
}
