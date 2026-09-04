import { CatalogState } from './catalog-state';

export default function CatalogNotFound() {
  return (
    <CatalogState
      kind="not-found"
      title="مورد درخواستی یافت نشد"
      message="نشانی یا شناسه موردنظر معتبر نیست یا دیگر وجود ندارد."
      returnHref="/catalog/products"
      returnLabel="بازگشت به محصولات"
    />
  );
}
