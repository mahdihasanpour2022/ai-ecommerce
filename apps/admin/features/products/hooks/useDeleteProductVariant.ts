'use client';

import { useRQDeleter } from '../../../hooks/rq_hooks/useRQDeleter';
import type { DeleteProductVariantResponse } from '../interfaces/product-contract';
import { productKeys } from './useGetProducts';

export function useDeleteProductVariant() {
  return useRQDeleter<DeleteProductVariantResponse, string>({
    mutationKey: ['products', 'variants', 'delete'],
    request: {
      method: 'delete',
      url: (variantId) => `/admin/catalog/variants/${encodeURIComponent(variantId)}`,
    },
    invalidateQueryKeys: [productKeys.all],
  });
}
