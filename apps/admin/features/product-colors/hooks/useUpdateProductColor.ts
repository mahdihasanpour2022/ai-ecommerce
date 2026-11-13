'use client';

import { useRQSender } from '../../../hooks/rq_hooks/useRQSender';
import { productOptionKeys } from '../../../hooks/shared/productOptionKeys';
import type { ApiResponse } from '../../../app/http/api-response';
import type { ProductColorOption } from '../../../hooks/shared/useGetProductColors';

export interface UpdateProductColorVariables {
  readonly currentEnglishName: string;
  readonly persianName: string;
  readonly englishName: string;
  readonly hexCode: string;
}

export type UpdateProductColorResponse = ApiResponse<null, ProductColorOption, null>;

export function useUpdateProductColor() {
  return useRQSender<UpdateProductColorResponse, UpdateProductColorVariables>({
    mutationKey: ['product-options', 'colors', 'update'],
    request: {
      method: 'patch',
      url: ({ currentEnglishName }) =>
        `/admin/catalog/product-options/colors/${encodeURIComponent(currentEnglishName)}`,
      body: ({ currentEnglishName: _currentEnglishName, ...values }) => values,
    },
    invalidateQueryKeys: [productOptionKeys.colors],
  });
}
