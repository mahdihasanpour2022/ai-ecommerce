'use client';

import { App } from 'antd';
import { useEffect } from 'react';
import { useRQFetcher } from '../../../hooks/rq_hooks/useRQFetcher';
import type { CategoriesResponse } from '../interfaces/category-contract';

export const categoryKeys = {
  all: ['categories'] as const,
};

export function useGetCategories() {
  const { message } = App.useApp();
  const response = useRQFetcher<CategoriesResponse>({
    queryKey: categoryKeys.all,
    url: '/admin/catalog/categories',
    staleTime: 5000,
    gcTime: 5000,
  });

  const { error } = response;
  useEffect(() => {
    if (error && error.kind !== 'canceled') {
      void message.error({
        key: 'categories-load-error',
        content: error.message,
      });
    }
  }, [error, message]);

  return response;
}
