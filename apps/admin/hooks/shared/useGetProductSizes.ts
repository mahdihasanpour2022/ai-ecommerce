'use client';

import { App } from 'antd';
import { useEffect } from 'react';
import type { ApiResponse } from '../../app/http/api-response';
import { useRQFetcher } from '../rq_hooks/useRQFetcher';
import { productOptionKeys } from './productOptionKeys';

export interface ProductSizeOption {
  readonly 'persian-size-name': string;
  readonly 'english-size-name': string;
}

export type ProductSizesResponse = ApiResponse<readonly ProductSizeOption[], null, null>;

export function useGetProductSizes(enabled = true) {
  const { message } = App.useApp();
  const response = useRQFetcher<ProductSizesResponse>({
    queryKey: productOptionKeys.sizes,
    url: '/admin/catalog/product-options/sizes',
    enabled,
    staleTime: Infinity,
  });

  const { error } = response;
  useEffect(() => {
    if (error && error.kind !== 'canceled') {
      void message.error({ key: 'product-sizes-load-error', content: error.message });
    }
  }, [error, message]);
  return response;
}
