'use client';

import { useRQSender } from '../../../hooks/rq_hooks/useRQSender';
import type { EditCategoryResponse, EditCategoryVariables } from '../interfaces/category-contract';
import { categoryKeys } from './useGetCategories';

export function useEditCategory() {
  return useRQSender<EditCategoryResponse, EditCategoryVariables>({
    mutationKey: ['categories', 'edit'],
    request: {
      method: 'patch',
      url: ({ categoryId }) => `/admin/catalog/categories/${encodeURIComponent(categoryId)}`,
      body: ({ image, name, parentId }) => {
        const body = new FormData();
        if (image) body.append('file', image);
        body.append('name', name);
        body.append('parentId', parentId ?? '');
        return body;
      },
    },
    invalidateQueryKeys: [categoryKeys.all],
  });
}
