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
      body: (variables) => variables,
    },
    invalidateQueryKeys: [categoryKeys.all],
  });
}
