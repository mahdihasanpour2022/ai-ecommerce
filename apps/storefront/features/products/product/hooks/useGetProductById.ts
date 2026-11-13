'use client';

import { ApiResponse } from '@/app/http/api-response';
import { ApiRoutes } from '@/constants/apiRoues';
import { useRQFetcher } from '@/hooks/rq_hooks/useRQFetcher';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { ProductByID } from '../interfaces/productById';
import { PRODUCT_STALE_TIME_MS, productKeys } from '../queries/product-query';

export type ProductResponse = ApiResponse<null, ProductByID, null>;

export const useGetProductById = ({ productId }: { productId: string }) => {
  const response = useRQFetcher<ProductResponse>({
    queryKey: productKeys.detail(productId),
    url: ApiRoutes.product(productId),
    staleTime: PRODUCT_STALE_TIME_MS,
  });

  const { error, isError } = response;
  useEffect(() => {
    if (isError && error) {
      toast.error(error.message, { duration: 2_000 });
    }
  }, [isError, error]);

  return response;
};
