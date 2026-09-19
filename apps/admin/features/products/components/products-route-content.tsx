'use client';

import { useUrlPage } from '../../../hooks/use-url-page';
import AddProduct from './add-product';
import Products from './products';

export default function ProductsRouteContent() {
  const { page, setPage } = useUrlPage();

  return (
    <div className="relative h-full pt-2">
      <AddProduct onCreated={() => setPage(1)} />
      <Products page={page} onPageChange={setPage} />
    </div>
  );
}
