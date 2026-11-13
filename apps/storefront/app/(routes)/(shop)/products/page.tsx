import { ProductsCollection } from '@/features/products/collections/components/collections';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'محصولات',
  description: 'محصولات',
};

const normalizedName = (value: string | string[] | undefined): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const name = value.normalize('NFKC').trim().replace(/\s+/gu, ' ');
  return name.length > 0 && Array.from(name).length <= 200 ? name : undefined;
};

const normalizedFilters = (value: string | string[] | undefined): readonly string[] | undefined => {
  const values = Array.isArray(value) ? value : value === undefined ? [] : [value];
  const filters = [
    ...new Set(values.map(normalizedName).filter((item): item is string => item !== undefined)),
  ];
  return filters.length > 0 ? filters : undefined;
};

const ProductsPage = async ({ searchParams }: PageProps<'/products'>) => {
  const resolvedSearchParams = await searchParams;
  const name = normalizedName(resolvedSearchParams.name);
  const categories = normalizedFilters(resolvedSearchParams.categories);
  const tags = normalizedFilters(resolvedSearchParams.tags);

  return (
    <ProductsCollection
      title={
        name
          ? `نتیجه جستجوی «${name}»`
          : categories
            ? 'محصولات دسته‌بندی'
            : tags
              ? `نتیجه جستجوی «${tags.join('، ')}»`
              : 'همه محصولات'
      }
      description=""
      {...(name ? { name } : categories ? { categories } : tags ? { tags } : {})}
    />
  );
};

export default ProductsPage;
