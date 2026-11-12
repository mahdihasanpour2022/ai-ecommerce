'use client';

import { ApiResponse } from '@/app/http/api-response';
import { ApiRoutes } from '@/features/home/constants/apiRoues';
import { useRQFetcher } from '@/hooks/rq_hooks/useRQFetcher';
import { Product } from '@/interfaces/product';
import { useEffect } from 'react';
import { toast } from 'sonner';

type ProductsResponse = ApiResponse<readonly Product[], null, null>;

interface GetProductsParams {
  readonly name?: string;
  readonly categories?: readonly string[];
  readonly tags?: readonly string[];
  readonly color?: string;
  readonly size?: string;
  readonly page?: number;
  readonly pageSize?: number;
  readonly enabled?: boolean;
}

export const useGetProducts = ({
  page,
  pageSize,
  name,
  categories,
  tags,
  color,
  size,
  enabled = false,
}: GetProductsParams) => {
  const response = useRQFetcher<ProductsResponse>({
    queryKey: [
      'products',
      'list',
      { page: page ?? 1, pageSize: pageSize ?? 30, name, categories, tags, color, size },
    ],
    url: ApiRoutes.products,
    staleTime: 30_000,
    gcTime: 30_000,
    enabled,
    axiosConfig: {
      params: { page: page ?? 1, pageSize: pageSize ?? 30, name, categories, tags, color, size },
    },
  });

  const { error, isError } = response;

  useEffect(() => {
    if (error && isError) {
      toast.error(error.message, { duration: 2_000 });
    }
  }, [error, isError]);

  return response;
};
