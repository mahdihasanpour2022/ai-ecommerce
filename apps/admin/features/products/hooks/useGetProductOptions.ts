'use client';

import { App } from 'antd';
import { useEffect } from 'react';
import { useRQFetcher } from '../../../hooks/rq_hooks/useRQFetcher';
import type {
  ProductColorsResponse,
  ProductSizesResponse,
  ProductStatusesResponse,
} from '../interfaces/product-option-contract';

export const productOptionKeys = {
  sizes: ['product-options', 'sizes'] as const,
  colors: ['product-options', 'colors'] as const,
  statuses: ['product-options', 'statuses'] as const,
};

export function useGetProductSizes() {
  const { message } = App.useApp();
  const response = useRQFetcher<ProductSizesResponse>({
    queryKey: productOptionKeys.sizes,
    url: '/admin/catalog/product-options/sizes',
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

export function useGetProductColors() {
  const { message } = App.useApp();
  const response = useRQFetcher<ProductColorsResponse>({
    queryKey: productOptionKeys.colors,
    url: '/admin/catalog/product-options/colors',
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

export function useGetProductStatuses() {
  const { message } = App.useApp();
  const response = useRQFetcher<ProductStatusesResponse>({
    queryKey: productOptionKeys.statuses,
    url: '/admin/catalog/product-options/statuses',
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
