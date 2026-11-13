'use client';

import { UiButton } from '@/app/components/shared/ui-button';
import { UiLoading } from '@/app/components/shared/ui-loading';
import { useGetProductSizes } from '@/hooks/shared/useGetProductSizes';
import { AddProductSizes } from './add-product-size';
import { ProductSizeTable } from './product-size-table';

const ProductSizes = () => {
  const sizes = useGetProductSizes();

  if (sizes.isPending) {
    return <UiLoading message="در حال دریافت سایزها" className="h-full" />;
  }

  return (
    <section aria-labelledby="product-sizes-title">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="product-sizes-title" className="text-foreground mb-2 text-xl font-bold">
            مدیریت سایزها
          </h2>
          <p className="text-muted mt-1 mb-0 text-sm">
            سایزهای قابل انتخاب برای محصولات پنل و فروشگاه
          </p>
        </div>
        <AddProductSizes />
      </div>

      {sizes.isError ? (
        <div className="bg-surface-subtle rounded-xl p-4" role="alert">
          <p className="text-foreground m-0">دریافت سایزها ناموفق بود.</p>
          <UiButton
            className="mt-3"
            variant="secondary"
            disabled={sizes.isFetching}
            onClick={() => void sizes.refetch()}
          >
            تلاش دوباره
          </UiButton>
        </div>
      ) : sizes.data.result.length === 0 ? (
        <p className="bg-surface-subtle text-muted rounded-xl p-4">سایزی تعریف نشده است.</p>
      ) : (
        <ProductSizeTable sizes={sizes.data.result} />
      )}
    </section>
  );
};

export default ProductSizes;
