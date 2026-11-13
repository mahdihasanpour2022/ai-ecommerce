'use client';

import { UiButton } from '../../../app/components/shared/ui-button';
import { UiLoading } from '../../../app/components/shared/ui-loading';
import { useGetProductColors } from '@/hooks/shared/useGetProductColors';
import { ProductColorTable } from './product-color-table';
import { AddProductColor } from './add-product-color';

export default function ProductColors() {
  const colors = useGetProductColors();

  if (colors.isPending) {
    return <UiLoading message="در حال دریافت رنگ‌ها…" className="h-full" />;
  }

  return (
    <section aria-labelledby="product-colors-title">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="product-colors-title" className="mb-2 text-xl font-bold text-foreground">
            مدیریت رنگ‌ها
          </h2>
          <p className="mb-0 mt-1 text-sm text-muted">
            رنگ‌های قابل انتخاب برای محصولات پنل و فروشگاه
          </p>
        </div>
        <AddProductColor />
      </div>

      {colors.isError ? (
        <div className="rounded-xl bg-surface-subtle p-4" role="alert">
          <p className="m-0 text-foreground">دریافت رنگ‌ها ناموفق بود.</p>
          <UiButton
            className="mt-3"
            variant="secondary"
            disabled={colors.isFetching}
            onClick={() => void colors.refetch()}
          >
            تلاش دوباره
          </UiButton>
        </div>
      ) : colors.data.result.length === 0 ? (
        <p className="rounded-xl bg-surface-subtle p-4 text-muted">رنگی تعریف نشده است.</p>
      ) : (
        <ProductColorTable colors={colors.data.result} />
      )}
    </section>
  );
}
