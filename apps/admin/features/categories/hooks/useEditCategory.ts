'use client';

import { useRQSender } from '../../../hooks/rq_hooks/useRQSender';
import type {
  EditCategoryResponse,
  EditCategoryVariables,
} from '../interfaces/category-contract';
import { categoryKeys } from './useGetCategories';

export function useEditCategory() {
  return useRQSender<EditCategoryResponse, EditCategoryVariables>({
    mutationKey: ['categories', 'edit'],
    request: {
      method: 'patch',
      url: ({ categoryId }) => `/admin/catalog/categories/${encodeURIComponent(categoryId)}`,
      body: ({ name, parentId }) => ({ name, parentId }),
    },
    invalidateQueryKeys: [categoryKeys.all],
  });
}
