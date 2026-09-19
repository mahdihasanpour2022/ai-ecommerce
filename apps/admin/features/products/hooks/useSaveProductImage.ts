'use client';

import { useRQSender } from '../../../hooks/rq_hooks/useRQSender';
import type {
  SaveProductImageVariables,
  UploadProductImageResponse,
} from '../interfaces/product-contract';

export function useSaveProductImage() {
  return useRQSender<UploadProductImageResponse, SaveProductImageVariables>({
    mutationKey: ['products', 'images', 'edit'],
    request: {
      method: 'post',
      url: ({ currentImageId, productId }) =>
        currentImageId
          ? `/admin/catalog/product-images/${encodeURIComponent(currentImageId)}/replacements`
          : `/admin/catalog/products/${encodeURIComponent(productId)}/images`,
      body: ({ file, imageVersion }) => {
        const body = new FormData();
        body.append('file', file);
        body.append('imageVersion', String(imageVersion));
        return body;
      },
    },
  });
}
