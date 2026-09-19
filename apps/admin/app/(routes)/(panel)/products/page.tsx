import { Suspense } from 'react';
import { UiLoading } from '@/app/components/shared/ui-loading';
import ProductsRouteContent from '@/features/products/components/products-route-content';

const ProductsPage = () => {
  return (
    <Suspense fallback={<UiLoading message="در حال آماده‌سازی محصولات…" className="h-full" />}>
      <ProductsRouteContent />
    </Suspense>
  );
};

export default ProductsPage;
