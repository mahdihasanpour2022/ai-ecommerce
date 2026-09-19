'use client';

import { useRQFetcher } from '../../../hooks/rq_hooks/useRQFetcher';
import type { ProductDetailResponse } from '../interfaces/product-contract';
import { productKeys } from './useGetProducts';

export function useGetProductDetail(productId: string | null) {
  const safeProductId = productId ?? '00000000-0000-4000-8000-000000000000';
  return useRQFetcher<ProductDetailResponse>({
    queryKey: productKeys.detail(safeProductId),
    url: `/admin/catalog/products/${encodeURIComponent(safeProductId)}`,
    enabled: productId !== null,
    staleTime: 0,
  });
}
