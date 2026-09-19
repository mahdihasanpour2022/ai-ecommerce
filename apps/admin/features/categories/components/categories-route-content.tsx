'use client';

import { useUrlPage } from '../../../hooks/use-url-page';
import AddCategory from './add-category';
import Categories from './categories';

export default function CategoriesRouteContent() {
  const { page, setPage } = useUrlPage();

  return (
    <div className="relative h-full pt-2">
      <AddCategory onCreated={() => setPage(1)} />
      <Categories page={page} onPageChange={setPage} />
    </div>
  );
}
