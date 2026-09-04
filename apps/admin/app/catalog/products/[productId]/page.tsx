import { notFound } from 'next/navigation';
import { isCatalogUuid } from '../../catalog-contracts';
import { CatalogPage } from '../../catalog-page';
import { ProductWorkspace } from '../product-workspace';
import type { ProductWorkspaceSection } from '../product-workspace';

const SECTIONS = new Set<ProductWorkspaceSection>(['overview', 'variants', 'inventory', 'images']);

interface ProductWorkspacePageProps {
  readonly params: Promise<{ productId: string }>;
  readonly searchParams: Promise<{ section?: string | string[] }>;
}

export default async function ProductWorkspacePage({
  params,
  searchParams,
}: ProductWorkspacePageProps) {
  const { productId } = await params;
  const { section: rawSection } = await searchParams;
  if (
    !isCatalogUuid(productId) ||
    (rawSection !== undefined &&
      (typeof rawSection !== 'string' || !SECTIONS.has(rawSection as ProductWorkspaceSection)))
  )
    notFound();
  const section = (rawSection ?? 'overview') as ProductWorkspaceSection;
  return (
    <CatalogPage
      breadcrumbs={[
        { label: 'خانه', href: '/' },
        { label: 'محصولات', href: '/catalog/products' },
        { label: 'فضای محصول' },
      ]}
    >
      <ProductWorkspace productId={productId} section={section} />
    </CatalogPage>
  );
}
