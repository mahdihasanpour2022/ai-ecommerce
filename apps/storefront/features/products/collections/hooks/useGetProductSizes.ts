'use client';

import type { ApiResponse } from '@/app/http/api-response';
import { ApiRoutes } from '@/constants/apiRoues';
import { useRQFetcher } from '@/hooks/rq_hooks/useRQFetcher';
import { useEffect } from 'react';
import { toast } from 'sonner';

export interface ProductSizeOption {
  readonly 'persian-size-name': string;
  readonly 'english-size-name': string;
}

type ProductSizesResponse = ApiResponse<readonly ProductSizeOption[], null, null>;

export function useGetProductSizes() {
  const response = useRQFetcher<ProductSizesResponse>({
    queryKey: ['product-options', 'sizes'],
    url: ApiRoutes.productSizes,
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
