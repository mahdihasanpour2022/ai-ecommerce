import { CatalogPage } from '../catalog-page';
import { ProductList } from './product-list';
import { parseProductListLocation } from './product-model';
import type { RawSearchParams } from './product-model';

export default async function ProductsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<RawSearchParams> }>) {
  const location = parseProductListLocation(await searchParams);
  return (
    <CatalogPage breadcrumbs={[{ label: 'خانه', href: '/' }, { label: 'محصولات' }]}>
      <ProductList location={location} />
    </CatalogPage>
  );
}
