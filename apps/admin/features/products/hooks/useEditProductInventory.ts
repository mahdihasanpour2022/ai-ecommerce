'use client';

import { useRQSender } from '../../../hooks/rq_hooks/useRQSender';
import type {
  EditProductInventoryResponse,
  EditProductInventoryVariables,
} from '../interfaces/product-contract';

export function useEditProductInventory() {
  return useRQSender<EditProductInventoryResponse, EditProductInventoryVariables>({
    mutationKey: ['products', 'inventory', 'edit'],
    request: {
      method: 'put',
      url: ({ variantId }) => `/admin/catalog/variants/${encodeURIComponent(variantId)}/inventory`,
      body: ({ onHandQuantity, version }) => ({ onHandQuantity, version }),
    },
  });
}
