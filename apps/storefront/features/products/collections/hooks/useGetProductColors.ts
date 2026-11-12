'use client';

import type { ApiResponse } from '@/app/http/api-response';
import { ApiRoutes } from '@/features/home/constants/apiRoues';
import { useRQFetcher } from '@/hooks/rq_hooks/useRQFetcher';
import { useEffect } from 'react';
import { toast } from 'sonner';

export interface ProductColorOption {
  readonly 'persian-color-name': string;
  readonly 'english-color-name': string;
  readonly 'hex-code': string;
}

type ProductColorsResponse = ApiResponse<readonly ProductColorOption[], null, null>;

export function useGetProductColors() {
  const response = useRQFetcher<ProductColorsResponse>({
    queryKey: ['product-options', 'colors'],
    url: ApiRoutes.productColors,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const { isError, error } = response;
  useEffect(() => {
    if (isError && error) {
      toast.error(error.message, { duration: 2_000 });
    }
  }, [isError, error]);

  return response;
}
