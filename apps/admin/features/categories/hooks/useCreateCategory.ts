'use client';

import { useRQSender } from '../../../hooks/rq_hooks/useRQSender';
import type {
  CreateCategoryResponse,
  CreateCategoryVariables,
} from '../interfaces/category-contract';
import { categoryKeys } from './useGetCategories';

export function useCreateCategory() {
  return useRQSender<CreateCategoryResponse, CreateCategoryVariables>({
    mutationKey: ['categories', 'create'],
    request: {
      method: 'post',
      url: '/admin/catalog/categories',
      body: ({ image, name, parentId }) => {
        const body = new FormData();
        body.append('file', image);
        body.append('name', name);
        body.append('parentId', parentId ?? '');
        return body;
      },
    },
    invalidateQueryKeys: [categoryKeys.all],
  });
}
