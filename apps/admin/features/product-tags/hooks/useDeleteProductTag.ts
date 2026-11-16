'use client';

import type { ApiResponse } from '../../../app/http/api-response';
import { useRQDeleter } from '../../../hooks/rq_hooks/useRQDeleter';
import { productOptionKeys } from '../../../hooks/shared/productOptionKeys';

type DeleteProductTagResponse = ApiResponse<null, null, null>;

export function useDeleteProductTag() {
  return useRQDeleter<DeleteProductTagResponse, string>({
    mutationKey: ['product-options', 'tags', 'delete'],
    request: {
      method: 'delete',
      url: (englishTagName) =>
        `/admin/catalog/product-options/tags/${encodeURIComponent(englishTagName)}`,
    },
    invalidateQueryKeys: [productOptionKeys.tags],
  });
}
