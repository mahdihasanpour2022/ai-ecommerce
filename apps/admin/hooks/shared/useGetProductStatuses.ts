'use client';

import { App } from 'antd';
import { useEffect } from 'react';
import type { ApiResponse } from '../../app/http/api-response';
import { useRQFetcher } from '../rq_hooks/useRQFetcher';
import { productOptionKeys } from './productOptionKeys';

export interface ProductStatusOption {
  readonly status_persian_name: string;
  readonly status_english_name: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
}

export type ProductStatusesResponse = ApiResponse<readonly ProductStatusOption[], null, null>;

export function useGetProductStatuses(enabled = true) {
  const { message } = App.useApp();
  const response = useRQFetcher<ProductStatusesResponse>({
    queryKey: productOptionKeys.statuses,
    url: '/admin/catalog/product-options/statuses',
    enabled,
    staleTime: Infinity,
  });

  const { error } = response;
  useEffect(() => {
    if (error && error.kind !== 'canceled') {
      void message.error({ key: 'product-statuses-load-error', content: error.message });
    }
  }, [error, message]);
  return response;
}
