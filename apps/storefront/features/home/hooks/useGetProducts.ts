'use client';

import { ApiResponse } from '@/app/http/api-response';
import { useRQFetcher } from '@/hooks/rq_hooks/useRQFetcher';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { ApiRoutes } from '../constants/apiRoues';
import { Product } from '@/interfaces/product';



type ProductsResponse = ApiResponse<readonly Product[], null, null>;

export const useGetProducts = ({ tags }: { tags?: string[] }) => {
  const response = useRQFetcher<ProductsResponse>({
    queryKey: ['amazing_products', tags],
    url: ApiRoutes.products,
    staleTime: 30_000,
    gcTime: 30_000,
    axiosConfig: { params: { page: 1, pageSize: 30, tags } },
  });

  const { error, isError } = response;

  useEffect(() => {
    if (error && isError) {
      toast.error(error.message, { duration: 2_000 });
    }
  }, [error, isError]);

  return response;
};
