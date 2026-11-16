'use client';

import type { ApiResponse } from '../../../app/http/api-response';
import { useRQSender } from '../../../hooks/rq_hooks/useRQSender';
import { productOptionKeys } from '../../../hooks/shared/productOptionKeys';
import type { ProductTagOption } from '../../../hooks/shared/useGetProductTags';

export interface ProductTagPayload {
  readonly englishName: string;
}

type CreateProductTagResponse = ApiResponse<null, ProductTagOption, null>;

export function useCreateProductTag() {
  return useRQSender<CreateProductTagResponse, ProductTagPayload>({
    mutationKey: ['product-options', 'tags', 'create'],
    request: {
      method: 'post',
      url: '/admin/catalog/product-options/tags',
      body: (values) => values,
    },
    invalidateQueryKeys: [productOptionKeys.tags],
  });
}
