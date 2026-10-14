'use client';

import { App } from 'antd';
import { useEffect } from 'react';

import { useRQFetcher } from '../../../hooks/rq_hooks/useRQFetcher';
import type { BannersResponse } from '../interfaces/banner-contract';

export const bannerKeys = { all: ['banners'] as const };

// فهرست بنرها را از مسیر امن BFF دریافت و خطای آن را فارسی نمایش می‌دهد.
export function useGetBanners() {
  const { message } = App.useApp();
  const response = useRQFetcher<BannersResponse>({
    queryKey: bannerKeys.all,
    url: '/admin/catalog/banners',
    staleTime: 5000,
    gcTime: 5000,
  });
  const { error } = response;

  useEffect(() => {
    if (error && error.kind !== 'canceled') {
      void message.error({ key: 'banners-load-error', content: error.message });
    }
  }, [error, message]);

  return response;
}
