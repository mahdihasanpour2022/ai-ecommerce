'use client';

import { Skeleton } from '@/components/shared';
import { UiHeading, UiP } from '@/components/shared/ui';
import { CollectionProductCard } from '@/features/components/shared';
import { useGetProducts } from '@/hooks/shared/useGetProducts';
import { nanoid } from 'nanoid';
import { useMemo } from 'react';
import { CollectionFiltersSidebar } from './subsets/collectionFiltersSidebar';

interface ProductsCollectionProps {
  readonly title: string;
  readonly description: string;
  readonly name?: string;
  readonly tags?: readonly string[];
  readonly categories?: readonly string[];
}

export const ProductsCollection = ({
  title,
  description,
  name,
  categories,
  tags,
}: ProductsCollectionProps) => {
  const { data, isLoading } = useGetProducts({
    enabled: true,
    ...(name ? { name } : {}),
    ...(categories ? { categories } : {}),
    ...(tags ? { tags } : {}),
  });

  const products = useMemo(() => {
    return data?.result ?? [];
  }, [data?.result]);

  const categoryNames = useMemo(() => {
    if (!categories) return [];
    const categoryIds = new Set(categories);
    return [
      ...new Set(
        products
          .filter((product) => categoryIds.has(product.category.id))
          .map((product) => product.category.name),
      ),
    ];
  }, [categories, products]);

  const displayTitle =
    categoryNames.length > 0 ? `نتیجه جستجوی «${categoryNames.join('، ')}»` : title;

  return (
    <main className="w-full px-4 py-8">
      <header className="mb-4 flex flex-col items-center justify-center gap-1">
        <UiHeading className="text-foreground/70 text-2xl! font-bold sm:text-3xl" type="h1">
          {displayTitle}
        </UiHeading>
        <UiP className="text-foreground/60! w-full text-center text-xs">{description}</UiP>
      </header>

      <section className="flex w-full items-start justify-between gap-4">
        <CollectionFiltersSidebar />

        {isLoading ? (
          <div className="grid w-full! grid-cols-2 gap-1 sm:grid-cols-2 lg:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-64 w-full bg-gray-200" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <UiP className="text-foreground/50! w-full p-10 text-start font-bold! sm:px-0!">
            محصولی در این مجموعه پیدا نشد.
          </UiP>
        ) : (
          <div className="mx-auto grid grid-cols-1 gap-0 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <CollectionProductCard key={nanoid()} product={product} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
};
