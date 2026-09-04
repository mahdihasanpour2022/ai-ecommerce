import { CatalogAccessNote } from '../../catalog-access-note';
import { CatalogPage } from '../../catalog-page';
import { CatalogState } from '../../catalog-state';

export default function PriceDisplayUnitPage() {
  return (
    <CatalogPage breadcrumbs={[{ label: 'خانه', href: '/' }, { label: 'واحد نمایش قیمت' }]}>
      <CatalogState
        kind="empty"
        title="واحد نمایش قیمت"
        message="مسیر تنظیمات محافظت‌شده آماده است. نمایش و تغییر واحد قیمت در مرحله تنظیمات افزوده می‌شود."
      />
      <CatalogAccessNote
        capability="priceSetting"
        allowedMessage="حساب شما مجوز تغییر واحد نمایش و ورود قیمت را دارد."
        readOnlyMessage="واحد قیمت برای حساب شما فقط خواندنی خواهد بود."
      />
    </CatalogPage>
  );
}
