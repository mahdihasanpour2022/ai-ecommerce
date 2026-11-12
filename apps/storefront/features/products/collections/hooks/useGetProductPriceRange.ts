'use client';

import type { ApiResponse } from '@/app/http/api-response';
import { ApiRoutes } from '@/features/home/constants/apiRoues';
import { useRQFetcher } from '@/hooks/rq_hooks/useRQFetcher';
import { useEffect } from 'react';
import { toast } from 'sonner';

export interface ProductPriceRange {
  readonly minimumPriceRial: number;
  readonly maximumPriceRial: number;
}

type ProductPriceRangeResponse = ApiResponse<null, ProductPriceRange, null>;

export function useGetProductPriceRange() {
  const response = useRQFetcher<ProductPriceRangeResponse>({
    queryKey: ['product-options', 'price-range'],
    url: ApiRoutes.productPriceRange,
    staleTime: 30_000,
    gcTime: 30_000,
  });

  const { error, isError } = response;
  useEffect(() => {
    if (error && isError) toast.error(error.message, { duration: 2_000 });
  }, [error, isError]);

  return response;
}
