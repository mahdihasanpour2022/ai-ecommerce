'use client';

import { UiButton } from '@/app/components/shared/ui-button';
import { UiLoading } from '@/app/components/shared/ui-loading';
import { useGetProductTags } from '@/hooks/shared/useGetProductTags';
import { AddProductTag } from './add-product-tag';
import { ProductTagTable } from './product-tag-table';

export default function ProductTags() {
  const tags = useGetProductTags();

  if (tags.isPending) {
    return <UiLoading message="در حال دریافت برچسب‌ها" className="h-full" />;
  }

  return (
    <section aria-labelledby="product-tags-title">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="product-tags-title" className="text-foreground mb-2 text-xl font-bold">
            مدیریت تگ‌ها
          </h2>
          <p className="text-muted mt-1 mb-0 text-sm">برچسب‌های قابل استفاده برای محصولات</p>
        </div>
        <AddProductTag />
      </div>

      {tags.isError ? (
        <div className="bg-surface-subtle rounded-xl p-4" role="alert">
          <p className="text-foreground m-0">دریافت برچسب‌ها ناموفق بود.</p>
          <UiButton
            className="mt-3"
            variant="secondary"
            disabled={tags.isFetching}
            onClick={() => void tags.refetch()}
          >
            تلاش دوباره
          </UiButton>
        </div>
      ) : tags.data.result.length === 0 ? (
        <p className="bg-surface-subtle text-muted rounded-xl p-4">برچسبی تعریف نشده است.</p>
      ) : (
        <ProductTagTable tags={tags.data.result} />
      )}
    </section>
  );
}
