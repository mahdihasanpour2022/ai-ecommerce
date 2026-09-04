import { CatalogAccessNote } from '../catalog-access-note';
import { CatalogPage } from '../catalog-page';
import { CatalogState } from '../catalog-state';

export default function CategoriesPage() {
  return (
    <CatalogPage breadcrumbs={[{ label: 'خانه', href: '/' }, { label: 'دسته‌بندی‌ها' }]}>
      <CatalogState
        kind="empty"
        title="دسته‌بندی‌ها"
        message="زیرساخت امن این مسیر آماده است. نمایش و مدیریت درخت دسته‌بندی در مرحله بعد افزوده می‌شود."
      />
      <CatalogAccessNote
        capability="manage"
        allowedMessage="حساب شما مجوز مدیریت دسته‌بندی را دارد."
        readOnlyMessage="این بخش برای حساب شما فقط خواندنی خواهد بود."
      />
    </CatalogPage>
  );
}
