import { Suspense } from 'react';
import { UiLoading } from '@/app/components/shared/ui-loading';
import CategoriesRouteContent from '@/features/categories/components/categories-route-content';

const CategoriesPage = () => {
  return (
    <Suspense fallback={<UiLoading message="در حال آماده‌سازی دسته‌بندی‌ها…" className="h-full" />}>
      <CategoriesRouteContent />
    </Suspense>
  );
};

export default CategoriesPage;
