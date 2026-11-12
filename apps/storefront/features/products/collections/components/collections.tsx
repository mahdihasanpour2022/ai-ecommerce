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
}

export const ProductsCollection = ({ title, description, name, tags }: ProductsCollectionProps) => {
  const { data, isLoading } = useGetProducts({
    enabled: true,
    ...(name ? { name } : {}),
    ...(tags ? { tags } : {}),
  });

  const products = useMemo(() => {
    return data?.result ?? [];
  }, [data?.result]);

  return (
    <main className="w-full px-4 py-8">
      <header className="mb-4 flex flex-col items-center justify-center gap-2">
        <UiHeading className="text-foreground/70 text-2xl font-bold sm:text-3xl" type="h1">
          {title}
        </UiHeading>
        <UiP className="text-foreground/60 mt-2 max-w-3xl text-center">{description}</UiP>
      </header>

      <section className="flex w-full items-start justify-between gap-4">
        <CollectionFiltersSidebar />

        {isLoading ? (
          <div className="grid w-full! grid-cols-2 gap-1 sm:grid-cols-2 lg:grid-cols-2">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={index} className="h-64 w-full bg-gray-200" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <UiP className="text-foreground-10 w-full animate-pulse p-10! text-center">
            {name ? 'محصولی مطابق عبارت جستجو پیدا نشد.' : 'محصولی در این مجموعه پیدا نشد.'}
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
