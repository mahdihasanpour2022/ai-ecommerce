'use client';

import { useRQSender } from '../../../hooks/rq_hooks/useRQSender';
import type {
  AddProductVariantResponse,
  AddProductVariantVariables,
} from '../interfaces/product-contract';
import { productKeys } from './useGetProducts';

export function useAddProductVariant() {
  return useRQSender<AddProductVariantResponse, AddProductVariantVariables>({
    mutationKey: ['products', 'variants', 'add'],
    request: {
      method: 'post',
      url: ({ productId }) =>
        `/admin/catalog/products/${encodeURIComponent(productId)}/variants`,
      body: ({ productId: _productId, ...variant }) => variant,
    },
    invalidateQueryKeys: [productKeys.all],
  });
}
