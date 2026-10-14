'use client';

import { useRQSender } from '../../../hooks/rq_hooks/useRQSender';
import type { BannerResponse, UpdateBannerVariables } from '../interfaces/banner-contract';
import { bannerKeys } from './useGetBanners';

export function useUpdateBanner() {
  return useRQSender<BannerResponse, UpdateBannerVariables>({
    mutationKey: ['banners', 'update'],
    request: {
      method: 'patch',
      url: ({ bannerId }) => `/admin/catalog/banners/${encodeURIComponent(bannerId)}`,
      body: ({ image }) => {
        const body = new FormData();
        body.append('file', image);
        return body;
      },
    },
    invalidateQueryKeys: [bannerKeys.all],
  });
}
