import { Suspense } from 'react';

import { UiLoading } from '@/app/components/shared/ui-loading';
import BannersRouteContent from '@/features/banners/components/banners-route-content';

const BannersPage = () => (
  <Suspense fallback={<UiLoading message="در حال آماده‌سازی بنرها…" className="h-full" />}>
    <BannersRouteContent />
  </Suspense>
);

export default BannersPage;
