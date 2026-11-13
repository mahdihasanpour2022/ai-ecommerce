'use client';

import type { ApiResponse } from '../../../app/http/api-response';
import { useRQDeleter } from '../../../hooks/rq_hooks/useRQDeleter';
import { productOptionKeys } from '../../../hooks/shared/productOptionKeys';

export type DeleteProductSizeResponse = ApiResponse<null, null, null>;

export function useDeleteProductSize() {
  return useRQDeleter<DeleteProductSizeResponse, string>({
    mutationKey: ['product-options', 'sizes', 'delete'],
    request: {
      method: 'delete',
      url: (englishSizeName) =>
        `/admin/catalog/product-options/sizes/${encodeURIComponent(englishSizeName)}`,
    },
    invalidateQueryKeys: [productOptionKeys.sizes],
  });
}
