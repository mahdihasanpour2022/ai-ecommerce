'use client';

import Image from 'next/image';
import { useState } from 'react';
import { UiModal } from '../../../app/components/shared/ui-modal';
import type { Category } from '../interfaces/category-contract';

export function CategoryThumbnail({ category }: Readonly<{ category: Category }>) {
  const [previewOpen, setPreviewOpen] = useState(false);
  if (!category.image) {
    return (
      <span
        className="flex size-12 items-center justify-center rounded-lg border border-border bg-surface-muted text-xs text-muted"
        aria-label="بدون تصویر"
      >
        —
      </span>
    );
  }
  const src = `/api/v1/admin/catalog/category-images/${category.image.id}/content`;
  return (
    <>
      <button
        type="button"
        className="block size-12 cursor-zoom-in overflow-hidden rounded-lg border border-border p-0 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand"
        aria-label={`نمایش بزرگ تصویر ${category.name}`}
        onClick={() => setPreviewOpen(true)}
      >
        <Image
          className="size-12 object-cover"
          src={src}
          alt={`تصویر ${category.name}`}
          width={48}
          height={48}
          unoptimized
        />
      </button>
      <UiModal.Root
        open={previewOpen}
        title={`تصویر دسته‌بندی ${category.name}`}
        width={{ xs: 'calc(100vw - 2rem)', sm: '50vw' }}
        onCancel={() => setPreviewOpen(false)}
      >
        <Image
          className="h-auto w-full rounded-xl object-contain"
          src={src}
          alt={`تصویر بزرگ ${category.name}`}
          width={category.image.width}
          height={category.image.height}
          sizes="(min-width: 640px) 50vw, calc(100vw - 2rem)"
          unoptimized
        />
      </UiModal.Root>
    </>
  );
}
