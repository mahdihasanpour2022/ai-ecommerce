import { UiLoading } from '@/app/components/shared/ui-loading';
import CategoriesRouteContent from '@/features/categories/components/categories-route-content';
import type { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'مدیریت دسته‌بندی‌ها',
  description: 'ایجاد، ویرایش و حذف دسته‌بندی‌ها',
};
const CategoriesPage = () => {
  return (
    <Suspense fallback={<UiLoading message="در حال آماده‌سازی دسته‌بندی‌ها…" className="h-full" />}>
      <CategoriesRouteContent />
    </Suspense>
  );
};

export default CategoriesPage;
