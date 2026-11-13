'use client';

import { App } from 'antd';
import { useEffect } from 'react';
import type { ApiResponse } from '../../app/http/api-response';
import { useRQFetcher } from '../rq_hooks/useRQFetcher';
import { productOptionKeys } from './productOptionKeys';

export interface ProductColorOption {
  readonly 'persian-color-name': string;
  readonly 'english-color-name': string;
  readonly 'hex-code': string;
}

export type ProductColorsResponse = ApiResponse<readonly ProductColorOption[], null, null>;

export function useGetProductColors(enabled = true) {
  const { message } = App.useApp();
  const response = useRQFetcher<ProductColorsResponse>({
    queryKey: productOptionKeys.colors,
    url: '/admin/catalog/product-options/colors',
    enabled,
    staleTime: Infinity,
  });

  const { error } = response;
  useEffect(() => {
    if (error && error.kind !== 'canceled') {
      void message.error({ key: 'product-colors-load-error', content: error.message });
    }
  }, [error, message]);
  return response;
}
