import { Skeleton } from '@/components/shared';
import { UiImage, UiP } from '@/components/shared/ui';
import { useGetProducts } from '@/features/home/hooks/useGetProducts';
import { nanoid } from 'nanoid';
import { useMemo } from 'react';

export const DiscountedProduct = () => {
  const { data, isLoading } = useGetProducts({ tags: ['discounted'] });

  const discountedProducts = useMemo(() => {
    return data?.result ?? [];
  }, [data?.result]);

  return (
    <section className="h-auto w-full px-6 py-4 sm:grid-cols-2 sm:px-12 sm:py-4 lg:grid-cols-4 lg:px-24 2xl:px-36">
      <UiP variant="style_4">پر تخفیف ها</UiP>
      {isLoading ? (
        <div className="grid h-auto w-full grid-cols-2 gap-4">
          <Skeleton className="h-64 w-full rounded-2xl bg-gray-200" />
          <Skeleton className="h-64 w-full rounded-2xl bg-gray-200" />
          <Skeleton className="h-64 w-full rounded-2xl bg-gray-200" />
          <Skeleton className="h-64 w-full rounded-2xl bg-gray-200" />
        </div>
      ) : (
        <div className="grid h-auto w-full grid-cols-2 gap-4">
          {discountedProducts.map((product) => (
            <UiImage
              key={nanoid()}
              src={product.image}
              width={350}
              height={350}
              className="h-full w-full rounded-2xl bg-cover!"
              alt={product.alt}
            />
          ))}
        </div>
      )}
    </section>
  );
};
