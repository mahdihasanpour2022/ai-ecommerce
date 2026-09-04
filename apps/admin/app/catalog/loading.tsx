import { CatalogState } from './catalog-state';

export default function CatalogLoading() {
  return (
    <CatalogState
      kind="loading"
      title="در حال دریافت اطلاعات کاتالوگ"
      message="لطفاً چند لحظه منتظر بمانید."
    />
  );
}
