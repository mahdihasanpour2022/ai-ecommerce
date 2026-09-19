'use client';

import { useRQSender } from '../../../hooks/rq_hooks/useRQSender';
import type {
  EditProductVariantResponse,
  EditProductVariantVariables,
} from '../interfaces/product-contract';

export function useEditProductVariant() {
  return useRQSender<EditProductVariantResponse, EditProductVariantVariables>({
    mutationKey: ['products', 'variants', 'edit'],
    request: {
      method: 'patch',
      url: ({ variantId }) => `/admin/catalog/variants/${encodeURIComponent(variantId)}`,
      body: ({ size, color, priceRial }) => ({
        ...(size === undefined ? {} : { size }),
        ...(color === undefined ? {} : { color }),
        ...(priceRial === undefined ? {} : { priceRial }),
      }),
    },
  });
}
