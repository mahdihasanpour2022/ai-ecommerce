'use client';

import Image from 'next/image';
import { useState } from 'react';

import { UiModal } from '../../../app/components/shared/ui-modal';
import type { Banner } from '../interfaces/banner-contract';

export function BannerThumbnail({ banner }: Readonly<{ banner: Banner }>) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const src = `/api/v1/admin/catalog/banners/${banner.id}/content`;

  return (
    <>
      <button
        type="button"
        className="block h-12 w-24 cursor-zoom-in overflow-hidden rounded-lg border border-border p-0 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand"
        aria-label="نمایش بزرگ تصویر بنر"
        onClick={() => setPreviewOpen(true)}
      >
        <Image className="size-full object-cover" src={src} alt="تصویر بنر" width={96} height={48} unoptimized />
      </button>
      <UiModal.Root
        open={previewOpen}
        title="پیش‌نمایش بنر"
        width={{ xs: 'calc(100vw - 2rem)', sm: '70vw' }}
        onCancel={() => setPreviewOpen(false)}
      >
        <Image
          className="h-auto w-full rounded-xl object-contain"
          src={src}
          alt="تصویر بزرگ بنر"
          width={banner.width}
          height={banner.height}
          sizes="(min-width: 640px) 70vw, calc(100vw - 2rem)"
          unoptimized
        />
      </UiModal.Root>
    </>
  );
}
