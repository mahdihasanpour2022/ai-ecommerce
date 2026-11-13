'use client';

import { useRQDeleter } from '../../../hooks/rq_hooks/useRQDeleter';
import { productOptionKeys } from '../../products/hooks/useGetProductOptions';
import type { DeleteProductColorResponse } from '../../products/interfaces/product-option-contract';

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
