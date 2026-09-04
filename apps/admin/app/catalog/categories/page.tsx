import { CatalogPage } from '../catalog-page';
import { CategoryManagement } from './category-management';

export default function CategoriesPage() {
  return (
    <CatalogPage breadcrumbs={[{ label: 'خانه', href: '/' }, { label: 'دسته‌بندی‌ها' }]}>
      <CategoryManagement />
    </CatalogPage>
  );
}
