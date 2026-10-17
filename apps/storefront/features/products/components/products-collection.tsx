'use client';

import { Skeleton } from '@/components/shared';
import { UiP } from '@/components/shared/ui';
import { ProductCard } from '@/features/components/shared/productCard';
import { useGetProducts } from '@/features/home/hooks/useGetProducts';

interface ProductsCollectionProps {
  readonly title: string;
  readonly description: string;
  readonly tags: string[];
}

export const ProductsCollection = ({ title, description, tags }: ProductsCollectionProps) => {
  const { data, error, isError, isLoading } = useGetProducts({ tags });
  const products = data?.result ?? [];

  return (
    <main className="w-full px-6 py-8 sm:px-12 lg:px-24 2xl:px-36">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{title}</h1>
        <UiP className="mt-2 max-w-3xl text-foreground/60">{description}</UiP>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-64 w-full rounded-xl bg-gray-200" />
          ))}
        </div>
      ) : isError ? (
        <UiP role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
          {error.message}
        </UiP>
      ) : products.length === 0 ? (
        <UiP className="rounded-xl bg-foreground/5 p-6 text-center">
          محصولی در این مجموعه پیدا نشد.
        </UiP>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </main>
  );
};
