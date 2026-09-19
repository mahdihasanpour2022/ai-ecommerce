'use client';

import { useRQSender } from '../../../hooks/rq_hooks/useRQSender';
import type {
  ChangeProductStatusResponse,
  ChangeProductStatusVariables,
} from '../interfaces/product-contract';
import { productKeys } from './useGetProducts';

export function useChangeProductStatus() {
  return useRQSender<ChangeProductStatusResponse, ChangeProductStatusVariables>({
    mutationKey: ['products', 'change-status'],
    request: {
      method: 'patch',
      url: ({ productId }) => `/admin/catalog/products/${encodeURIComponent(productId)}`,
      body: ({ status }) => ({ status }),
    },
    invalidateQueryKeys: [productKeys.all],
  });
}
