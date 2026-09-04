import { CatalogPage } from '../../catalog-page';
import { RequireCatalogCapability } from '../../catalog-shell';
import { CatalogState } from '../../catalog-state';

export default function NewProductPage() {
  return (
    <CatalogPage
      breadcrumbs={[
        { label: 'خانه', href: '/' },
        { label: 'محصولات', href: '/catalog/products' },
        { label: 'محصول جدید' },
      ]}
    >
      <RequireCatalogCapability capability="manage" title="ایجاد محصول مجاز نیست">
        <CatalogState
          kind="empty"
          title="ایجاد محصول پیش‌نویس"
          message="مسیر محافظت‌شده آماده است. فرم ایجاد محصول در مرحله پیاده‌سازی فهرست و پیش‌نویس افزوده می‌شود."
        />
      </RequireCatalogCapability>
    </CatalogPage>
  );
}
