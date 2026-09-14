'use client';

import { useRQDeleter } from '../../../hooks/rq_hooks/useRQDeleter';
import type { DeleteCategoryResponse } from '../interfaces/category-contract';
import { categoryKeys } from './useGetCategories';

export function useDeleteCategories() {
  return useRQDeleter<DeleteCategoryResponse, string>({
    mutationKey: ['categories', 'delete'],
    request: {
      method: 'delete',
      url: (categoryId) => `/admin/catalog/categories/${encodeURIComponent(categoryId)}`,
    },
    invalidateQueryKeys: [categoryKeys.all],
  });
}
