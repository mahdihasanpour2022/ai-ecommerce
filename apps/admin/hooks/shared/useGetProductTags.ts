'use client';

import { App } from 'antd';
import { useEffect } from 'react';
import type { ApiResponse } from '../../app/http/api-response';
import { useRQFetcher } from '../rq_hooks/useRQFetcher';
import { productOptionKeys } from './productOptionKeys';

export interface ProductTagOption {
  readonly 'english-tag-name': string;
}

export type ProductTagsResponse = ApiResponse<readonly ProductTagOption[], null, null>;

export function useGetProductTags(enabled = true) {
  const { message } = App.useApp();
  const response = useRQFetcher<ProductTagsResponse>({
    queryKey: productOptionKeys.tags,
    url: '/admin/catalog/product-options/tags',
    enabled,
    staleTime: Infinity,
  });
  const { error } = response;
  useEffect(() => {
    if (error && error.kind !== 'canceled') {
      void message.error({ key: 'product-tags-load-error', content: error.message });
    }
  }, [error, message]);
  return response;
}
