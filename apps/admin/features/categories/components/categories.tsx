'use client';

import { UiButton } from '../../../app/components/shared/ui-button';
import { UiLoading } from '../../../app/components/shared/ui-loading';
import { useGetCategories } from '../hooks/useGetCategories';
import { CategoryTable } from './category-table';

export default function Categories() {
  const { data: response, isError, isFetching, isPending, refetch } = useGetCategories();

  if (isPending) return <UiLoading message="در حال دریافت دسته‌بندی‌ها…" className='h-full'/>;

  return (
    <section aria-labelledby="categories-title">
      <h2 id="categories-title" className="mb-6! text-xl font-bold text-foreground">
        مدیریت دسته‌بندی‌ها
      </h2>

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
        <p className="rounded-xl bg-surface-subtle p-4 text-muted">
           دسته‌بندی‌ای ثبت نشده است.
        </p>
      ) : (
        <CategoryTable categories={response.result} />
      )}
    </section>
  );
}
