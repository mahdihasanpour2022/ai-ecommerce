'use client';

import { useRQDeleter } from '../../../hooks/rq_hooks/useRQDeleter';
import { productOptionKeys } from '../../../hooks/shared/productOptionKeys';
import type { ApiResponse } from '../../../app/http/api-response';

export type DeleteProductColorResponse = ApiResponse<null, null, null>;

export function useDeleteProductColor() {
  return useRQDeleter<DeleteProductColorResponse, string>({
    mutationKey: ['product-options', 'colors', 'delete'],
    request: {
      method: 'delete',
      url: (englishColorName) =>
        `/admin/catalog/product-options/colors/${encodeURIComponent(englishColorName)}`,
    },
    invalidateQueryKeys: [productOptionKeys.colors],
  });
}
