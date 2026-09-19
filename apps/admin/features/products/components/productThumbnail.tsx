'use client';

import Image from 'next/image';
import { useState } from 'react';
import { UiModal } from '../../../app/components/shared/ui-modal';
import { Product } from '../interfaces/product-contract';

export function ProductThumbnail({ product }: Readonly<{ product: Product }>) {
  const [previewOpen, setPreviewOpen] = useState(false);

  if (!product.mainImage) {
    return (
      <span
        className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-muted text-xs text-muted"
        aria-label="بدون تصویر"
      >
        —
      </span>
    );
  }

  const imageUrl = `/api/v1/admin/catalog/product-images/${product.mainImage.id}/content`;

  return (
    <>
      <button
        type="button"
        className="border overflow-hidden border-gray-300 p-0 block size-12 shrink-0 cursor-zoom-in rounded-lg focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand"
        aria-label={`نمایش بزرگ تصویر ${product.name}`}
        onClick={() => setPreviewOpen(true)}
      >
        <Image
          className="size-12 rounded-lg border border-border object-cover"
          src={imageUrl}
          alt={`تصویر ${product.name}`}
          width={48}
          height={48}
          unoptimized
        />
      </button>

      <UiModal.Root
        open={previewOpen}
        title={`تصویر محصول ${product.name}`}
        width={{ xs: 'calc(100vw - 2rem)', sm: '50vw' }}
        onCancel={() => setPreviewOpen(false)}
      >
        <Image
          className="h-auto w-full rounded-xl object-contain"
          src={imageUrl}
          alt={`تصویر بزرگ ${product.name}`}
          width={product.mainImage.width}
          height={product.mainImage.height}
          sizes="(min-width: 640px) 50vw, calc(100vw - 2rem)"
          unoptimized
        />
      </UiModal.Root>
    </>
  );
}
