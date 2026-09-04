import { CatalogAccessNote } from '../catalog-access-note';
import { CatalogPage } from '../catalog-page';
import { CatalogState } from '../catalog-state';

export default function ProductsPage() {
  return (
    <CatalogPage breadcrumbs={[{ label: 'خانه', href: '/' }, { label: 'محصولات' }]}>
      <CatalogState
        kind="empty"
        title="محصولات"
        message="زیرساخت امن فهرست محصول آماده است. داده‌ها و فیلترهای محصول در مرحله بعد افزوده می‌شوند."
      />
      <div className="catalog-permission-grid" aria-label="دسترسی‌های محصول">
        <CatalogAccessNote
          capability="manage"
          allowedMessage="حساب شما مجوز مدیریت محصول و تنوع را دارد."
          readOnlyMessage="محصول و تنوع برای حساب شما فقط خواندنی خواهند بود."
        />
        <CatalogAccessNote
          capability="inventory"
          allowedMessage="حساب شما مجوز به‌روزرسانی موجودی را دارد."
          readOnlyMessage="موجودی برای حساب شما فقط خواندنی خواهد بود."
        />
        <CatalogAccessNote
          capability="media"
          allowedMessage="حساب شما مجوز مدیریت تصویر محصول را دارد."
          readOnlyMessage="تصاویر برای حساب شما فقط خواندنی خواهند بود."
        />
      </div>
    </CatalogPage>
  );
}
