import { notFound } from 'next/navigation';
import { isCatalogUuid } from '../../catalog-contracts';
import { CatalogPage } from '../../catalog-page';
import { CatalogState } from '../../catalog-state';

const SECTIONS = new Set(['overview', 'variants', 'inventory', 'images']);

interface ProductWorkspacePageProps {
  readonly params: Promise<{ productId: string }>;
  readonly searchParams: Promise<{ section?: string | string[] }>;
}

export default async function ProductWorkspacePage({
  params,
  searchParams,
}: ProductWorkspacePageProps) {
  const { productId } = await params;
  const { section } = await searchParams;
  if (
    !isCatalogUuid(productId) ||
    (section !== undefined && (typeof section !== 'string' || !SECTIONS.has(section)))
  ) {
    notFound();
  }

  return (
    <CatalogPage
      breadcrumbs={[
        { label: 'خانه', href: '/' },
        { label: 'محصولات', href: '/catalog/products' },
        { label: 'فضای محصول' },
      ]}
    >
      <CatalogState
        kind="empty"
        title="فضای محصول"
        message="شناسه و بخش مسیر معتبر است. نمایش جزئیات محصول در مرحله نگه‌داری محصول افزوده می‌شود."
      />
    </CatalogPage>
  );
}
