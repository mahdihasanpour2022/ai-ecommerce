'use client';

import { useRQSender } from '../../../hooks/rq_hooks/useRQSender';
import type {
  UploadProductImageResponse,
  UploadProductImageVariables,
} from '../interfaces/product-contract';
import { productKeys } from './useGetProducts';

export function useUploadProductImage() {
  return useRQSender<UploadProductImageResponse, UploadProductImageVariables>({
    mutationKey: ['products', 'images', 'upload'],
    request: {
      method: 'post',
      url: ({ productId }) => `/admin/catalog/products/${productId}/images`,
      body: ({ file, imageVersion }) => {
        const body = new FormData();
        body.append('file', file);
        body.append('imageVersion', String(imageVersion));
        return body;
      },
    },
    invalidateQueryKeys: [productKeys.all],
  });
}
