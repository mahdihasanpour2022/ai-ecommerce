'use client';

import { useRQSender } from '../../../hooks/rq_hooks/useRQSender';
import { productOptionKeys } from '../../../hooks/shared/productOptionKeys';
import type { ApiResponse } from '../../../app/http/api-response';
import type { ProductColorOption } from '../../../hooks/shared/useGetProductColors';

export interface ProductColorPayload {
  readonly persianName: string;
  readonly englishName: string;
  readonly hexCode: string;
}

export type CreateProductColorResponse = ApiResponse<null, ProductColorOption, null>;

export function useCreateProductColor() {
  return useRQSender<CreateProductColorResponse, ProductColorPayload>({
    mutationKey: ['product-options', 'colors', 'create'],
    request: {
      method: 'post',
      url: '/admin/catalog/product-options/colors',
      body: (values) => values,
    },
    invalidateQueryKeys: [productOptionKeys.colors],
  });
}
