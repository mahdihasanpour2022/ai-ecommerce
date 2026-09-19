'use client';

import { App } from 'antd';
import { useEffect } from 'react';
import type { GetPageParams } from '../../../app/http/page-params';
import { useRQFetcher } from '../../../hooks/rq_hooks/useRQFetcher';
import type { ProductsResponse } from '../interfaces/product-contract';

export const productKeys = {
  all: ['products'] as const,
  list: ({ page, pageSize }: GetPageParams) => ['products', 'list', { page, pageSize }] as const,
  detail: (productId: string) => ['products', 'detail', productId] as const,
};

export function useGetProducts({ page, pageSize }: GetPageParams) {
  const { message } = App.useApp();
  const response = useRQFetcher<ProductsResponse>({
    queryKey: productKeys.list({ page, pageSize }),
    url: '/admin/catalog/products',
    axiosConfig: { params: { page, pageSize } },
    staleTime: 5000,
    gcTime: 5000,
  });

  const { error } = response;
  useEffect(() => {
    if (error && error.kind !== 'canceled') {
      void message.error({
        key: 'products-load-error',
        content: error.message,
      });
    }
  }, [error, message]);

  return response;
}
