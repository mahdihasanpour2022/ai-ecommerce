import { CatalogPage } from '../../catalog-page';
import { ProductCreate } from '../product-create';

export default function NewProductPage() {
  return (
    <CatalogPage
      breadcrumbs={[
        { label: 'خانه', href: '/' },
        { label: 'محصولات', href: '/catalog/products' },
        { label: 'محصول جدید' },
      ]}
    >
      <ProductCreate />
    </CatalogPage>
  );
}
