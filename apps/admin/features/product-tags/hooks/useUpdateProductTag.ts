'use client';

import type { ApiResponse } from '../../../app/http/api-response';
import { useRQSender } from '../../../hooks/rq_hooks/useRQSender';
import { productOptionKeys } from '../../../hooks/shared/productOptionKeys';
import type { ProductTagOption } from '../../../hooks/shared/useGetProductTags';

export interface UpdateProductTagVariables {
  readonly currentEnglishName: string;
  readonly englishName: string;
}

type UpdateProductTagResponse = ApiResponse<null, ProductTagOption, null>;

export function useUpdateProductTag() {
  return useRQSender<UpdateProductTagResponse, UpdateProductTagVariables>({
    mutationKey: ['product-options', 'tags', 'update'],
    request: {
      method: 'patch',
      url: ({ currentEnglishName }) =>
        `/admin/catalog/product-options/tags/${encodeURIComponent(currentEnglishName)}`,
      body: ({ currentEnglishName: _currentEnglishName, ...values }) => values,
    },
    invalidateQueryKeys: [productOptionKeys.tags],
  });
}
