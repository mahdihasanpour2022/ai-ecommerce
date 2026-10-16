'use client';

import type { ApiResponse } from '@/app/http/api-response';
import { ApiRoutes } from '@/features/home/constants/apiRoues';
import { useRQFetcher } from '@/hooks/rq_hooks/useRQFetcher';
import { useEffect } from 'react';
import { toast } from 'sonner';

interface HomeBanner {
  readonly id: string;
  readonly src: string;
  readonly alt: string | null;
  readonly mediaType: 'JPEG' | 'PNG' | 'WEBP';
  readonly byteSize: number;
  readonly width: number;
  readonly height: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

type HomeBannersResponse = ApiResponse<readonly HomeBanner[], null, null>;

export function useGetHomeBanners() {
  const response = useRQFetcher<HomeBannersResponse>({
    queryKey: ['home-banners'],
    staleTime: 60_000,
    gcTime: 60_000,
    url: ApiRoutes.home_banners,
  });
  const { error, isError } = response;

  useEffect(() => {
    if (error && isError) {
      toast.error(error.message, { duration: 2_000 });
    }
  }, [error, isError]);

  return response;
}
