'use client';

import { UiButton } from '../../../app/components/shared/ui-button';
import { UiLoading } from '../../../app/components/shared/ui-loading';
import { CATEGORY_PAGE_SIZE } from '../constants/pagination';
import { useGetCategories } from '../hooks/useGetCategories';
import { CategoryTable } from './category-table';

export default function Categories({
  page = 1,
  onPageChange = () => undefined,
}: Readonly<{ page?: number; onPageChange?: (page: number) => void }>) {
  const { data: response, isError, isFetching, isPending, refetch } = useGetCategories({
    page,
    pageSize: CATEGORY_PAGE_SIZE,
  });

  if (isPending) return <UiLoading message="در حال دریافت دسته‌بندی‌ها…" className="h-full" />;

  return (
    <section aria-labelledby="categories-title">
      <div className="mb-4">
        <h2 id="categories-title" className="mb-2 text-xl font-bold text-foreground">
          مدیریت دسته‌بندی‌ها
        </h2>
        <p className="mb-0 mt-1 text-sm text-muted">
          فهرست دسته بندی ها دسته‌بندی، موجودی و وضعیت انتشار
        </p>
      </div>

      {isError ? (
        <div className="rounded-xl bg-surface-subtle p-4" role="alert">
          <p className="text-foreground">دریافت دسته‌بندی‌ها ناموفق بود.</p>
          <UiButton
            className="mt-3"
            variant="secondary"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            تلاش دوباره
          </UiButton>
        </div>
      ) : response.result.length === 0 ? (
        <p className="rounded-xl bg-surface-subtle p-4 text-muted">دسته‌بندی‌ای ثبت نشده است.</p>
      ) : (
        <CategoryTable categories={response.result} page={page} onPageChange={onPageChange} />
      )}
    </section>
  );
}
