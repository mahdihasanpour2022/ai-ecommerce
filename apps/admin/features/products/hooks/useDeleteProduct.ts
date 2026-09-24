'use client';

import { useRQDeleter } from '../../../hooks/rq_hooks/useRQDeleter';
import type { DeleteProductResponse } from '../interfaces/product-contract';
import { productKeys } from './useGetProducts';

export function useDeleteProduct() {
  return useRQDeleter<DeleteProductResponse, string>({
    mutationKey: ['products', 'delete'],
    request: {
      method: 'delete',
      url: (productId) => `/admin/catalog/products/${encodeURIComponent(productId)}`,
    },
    invalidateQueryKeys: [productKeys.all],
  });
}
