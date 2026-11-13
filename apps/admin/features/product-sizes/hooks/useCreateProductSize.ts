'use client';

import type { ApiResponse } from '../../../app/http/api-response';
import { useRQSender } from '../../../hooks/rq_hooks/useRQSender';
import { productOptionKeys } from '../../../hooks/shared/productOptionKeys';
import type { ProductSizeOption } from '../../../hooks/shared/useGetProductSizes';

export interface ProductSizePayload {
  readonly persianName: string;
  readonly englishName: string;
}

export type CreateProductSizeResponse = ApiResponse<null, ProductSizeOption, null>;

export function useCreateProductSize() {
  return useRQSender<CreateProductSizeResponse, ProductSizePayload>({
    mutationKey: ['product-options', 'sizes', 'create'],
    request: {
      method: 'post',
      url: '/admin/catalog/product-options/sizes',
      body: (values) => values,
    },
    invalidateQueryKeys: [productOptionKeys.sizes],
  });
}
