'use client';

import { useRQSender } from '../../../hooks/rq_hooks/useRQSender';
import type { BannerResponse, CreateBannerVariables } from '../interfaces/banner-contract';
import { bannerKeys } from './useGetBanners';

export function useCreateBanner() {
  return useRQSender<BannerResponse, CreateBannerVariables>({
    mutationKey: ['banners', 'create'],
    request: {
      method: 'post',
      url: '/admin/catalog/banners',
      body: ({ image, alt }) => {
        const body = new FormData();
        body.append('file', image);
        body.append('alt', alt);
        return body;
      },
    },
    invalidateQueryKeys: [bannerKeys.all],
  });
}
