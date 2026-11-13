import { UiLoading } from '@/app/components/shared/ui-loading';
import ProductsRouteContent from '@/features/products/components/products-route-content';
import type { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'مدیریت محصولات',
  description: 'ایجاد، ویرایش و حذف محصولات',
};
const ProductsPage = () => {
  return (
    <Suspense fallback={<UiLoading message="در حال آماده‌سازی محصولات…" className="h-full" />}>
      <ProductsRouteContent />
    </Suspense>
  );
};

export default ProductsPage;
