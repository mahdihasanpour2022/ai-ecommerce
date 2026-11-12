'use client';

import { ApiResponse } from '@/app/http/api-response';
import { useRQFetcher } from '@/hooks/rq_hooks/useRQFetcher';
import { Product } from '@/interfaces/product';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { ApiRoutes } from '../constants/apiRoues';

type ProductsResponse = ApiResponse<readonly Product[], null, null>;

interface GetProductsParams {
  readonly name?: string;
  readonly tags?: readonly string[];
}

export const useGetProducts = ({ name, tags }: GetProductsParams) => {
  const response = useRQFetcher<ProductsResponse>({
    queryKey: [
      'products',
      'list',
      { page: 1, pageSize: 30, name, tags },
    ],
    url: ApiRoutes.products,
    staleTime: 30_000,
    gcTime: 30_000,
    axiosConfig: {
      params: { page: 1, pageSize: 30, name, tags },
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
