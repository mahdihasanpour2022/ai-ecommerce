'use client';

import { App } from 'antd';
import { useEffect } from 'react';
import type { GetPageParams } from '../../../app/http/page-params';
import { useRQFetcher } from '../../../hooks/rq_hooks/useRQFetcher';
import type { CategoriesResponse } from '../interfaces/category-contract';

export const categoryKeys = {
  all: ['categories'] as const,
  list: ({ page, pageSize }: GetPageParams) =>
    ['categories', 'list', { page, pageSize }] as const,
};

export function useGetCategories({
  page,
  pageSize,
  enabled = true,
}: GetPageParams & { readonly enabled?: boolean }) {
  const { message } = App.useApp();
  const response = useRQFetcher<CategoriesResponse>({
    queryKey: categoryKeys.list({ page, pageSize }),
    url: '/admin/catalog/categories',
    axiosConfig: { params: { page, pageSize } },
    enabled,
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
