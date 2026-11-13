'use client';

import type { ApiResponse } from '../../../app/http/api-response';
import { useRQSender } from '../../../hooks/rq_hooks/useRQSender';
import { productOptionKeys } from '../../../hooks/shared/productOptionKeys';
import type { ProductSizeOption } from '../../../hooks/shared/useGetProductSizes';

export interface UpdateProductSizeVariables {
  readonly currentEnglishName: string;
  readonly persianName: string;
  readonly englishName: string;
}

export type UpdateProductSizeResponse = ApiResponse<null, ProductSizeOption, null>;

export function useUpdateProductSize() {
  return useRQSender<UpdateProductSizeResponse, UpdateProductSizeVariables>({
    mutationKey: ['product-options', 'sizes', 'update'],
    request: {
      method: 'patch',
      url: ({ currentEnglishName }) =>
        `/admin/catalog/product-options/sizes/${encodeURIComponent(currentEnglishName)}`,
      body: ({ currentEnglishName: _currentEnglishName, ...values }) => values,
    },
    invalidateQueryKeys: [productOptionKeys.sizes],
  });
}
