'use client';

import type { PaginatedApiResponse } from '@/app/http/api-response';
import { ApiRoutes } from '@/features/home/constants/apiRoues';
import { useRQInfiniteFetcher } from '@/hooks/rq_hooks/useRQInfiniteFetcher';
import type { Product } from '@/interfaces/product';
import { useEffect } from 'react';
import { toast } from 'sonner';

type ProductsPage = PaginatedApiResponse<readonly Product[]>;

interface InfiniteProductsParams {
  readonly name?: string;
  readonly tags?: readonly string[];
  readonly pageSize?: number;
  readonly enabled?: boolean;
}

export function useInfiniteProducts({
  name,
  tags,
  pageSize = 10,
  enabled = false,
}: InfiniteProductsParams) {
  const response = useRQInfiniteFetcher<ProductsPage>({
    queryKey: ['products', 'infinite-list', { pageSize, name, tags }],
    url: ApiRoutes.products,
    pageSize,
    enabled,
    staleTime: 30_000,
    gcTime: 30_000,
    axiosConfig: { params: { name, tags } },
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
  });

  const { error, isError } = response;
  useEffect(() => {
    if (error && isError) toast.error(error.message, { duration: 2_000 });
  }, [error, isError]);

  return response;
}
