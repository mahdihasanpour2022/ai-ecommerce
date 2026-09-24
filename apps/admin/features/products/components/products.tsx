'use client';

import type { ReactNode } from 'react';
import { UiButton } from '../../../app/components/shared/ui-button';
import { UiLoading } from '../../../app/components/shared/ui-loading';
import { PRODUCT_PAGE_SIZE } from '../constants/pagination';
import { useGetProducts } from '../hooks/useGetProducts';
import type { ProductFilters } from '../interfaces/product-filter';
import { ProductTable } from './product-table';

export default function Products({
  page = 1,
  filters = {},
  filterPanel,
  onPageChange = () => undefined,
}: Readonly<{
  page?: number;
  filters?: ProductFilters;
  filterPanel?: ReactNode;
  onPageChange?: (page: number) => void;
}>) {
  const {
    data: response,
    isError,
    isFetching,
    isPending,
    refetch,
  } = useGetProducts({
    page,
    pageSize: PRODUCT_PAGE_SIZE,
    filters,
  });

  const productList = response?.singleResult;

  return (
    <section aria-labelledby="products-title">
      <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="products-title" className="m-0 text-xl font-bold text-foreground">
            مدیریت محصولات
          </h2>
          <p className="mb-0 mt-1 text-sm text-muted">
            فهرست محصولات، دسته‌بندی، موجودی و وضعیت انتشار
          </p>
        </div>
      </div>

      {filterPanel}

      {isPending ? (
        <UiLoading message="در حال دریافت محصولات…" className="min-h-48" />
      ) : isError || !productList ? (
        <div className="rounded-xl bg-surface-subtle p-4" role="alert">
          <p className="m-0 text-foreground">دریافت محصولات ناموفق بود.</p>
          <UiButton
            className="mt-3"
            variant="secondary"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            تلاش دوباره
          </UiButton>
        </div>
      ) : productList.items.length === 0 ? (
        <p className="rounded-xl bg-surface-subtle p-4 text-muted">
          {Object.keys(filters).length > 0
            ? 'محصولی مطابق فیلترهای انتخاب‌شده پیدا نشد.'
            : 'محصولی ثبت نشده است.'}
        </p>
      ) : (
        <ProductTable
          products={productList.items}
          page={productList.page}
          pageSize={productList.pageSize}
          totalItems={productList.totalItems}
          onPageChange={onPageChange}
        />
      )}
    </section>
  );
}
