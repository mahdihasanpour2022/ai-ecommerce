'use client';

import { useUrlPage } from '../../../hooks/use-url-page';
import { useProductFilters } from '../hooks/use-product-filters';
import AddProduct from './add-product';
import { ProductFilterPanel } from './product-filter-panel';
import Products from './products';

export default function ProductsRouteContent() {
  const { page, setPage } = useUrlPage();
  const { filters, applyFilters, clearFilters } = useProductFilters();

  return (
    <div className="relative h-full pt-2">
      <AddProduct onCreated={() => setPage(1)} />
      <Products
        page={page}
        filters={filters}
        onPageChange={setPage}
        filterPanel={
          <ProductFilterPanel filters={filters} onApply={applyFilters} onClear={clearFilters} />
        }
      />
    </div>
  );
}
