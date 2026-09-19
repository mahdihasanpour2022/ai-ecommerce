'use client';

import { useRQSender } from '../../../hooks/rq_hooks/useRQSender';
import type { EditProductResponse, EditProductVariables } from '../interfaces/product-contract';

export function useEditProduct() {
  return useRQSender<EditProductResponse, EditProductVariables>({
    mutationKey: ['products', 'edit'],
    request: {
      method: 'patch',
      url: ({ productId }) => `/admin/catalog/products/${encodeURIComponent(productId)}`,
      body: ({ name, description, categoryId }) => ({
        ...(name === undefined ? {} : { name }),
        ...(description === undefined ? {} : { description }),
        ...(categoryId === undefined ? {} : { categoryId }),
      }),
    },
  });
}
