'use client';

import { useRQSender } from '../../../hooks/rq_hooks/useRQSender';
import type {
  CreateProductResponse,
  CreateProductVariables,
} from '../interfaces/product-contract';
import { productKeys } from './useGetProducts';

export function useCreateProduct() {
  return useRQSender<CreateProductResponse, CreateProductVariables>({
    mutationKey: ['products', 'create'],
    request: {
      method: 'post',
      url: '/admin/catalog/products',
      body: (variables) => variables,
    },
    invalidateQueryKeys: [productKeys.all],
  });
}
