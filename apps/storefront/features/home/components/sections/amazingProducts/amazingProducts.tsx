import { Skeleton } from '@/components/shared';
import { UiCarousel, UiLink, UiP } from '@/components/shared/ui';
import { PRODUCT_COLLECTIONS } from '@/constants/productCollections';

import { ProductCard } from '@/features/components/shared/productCard';
import { useGetProducts } from '@/hooks/shared/useGetProducts';
import { useMemo } from 'react';

export const AmazingProducts = () => {
  const { data, isLoading } = useGetProducts({ tags: ['amazing'], enabled: true });

  const amazingProducts = useMemo(() => {
    return data?.result ?? [];
  }, [data?.result]);

  return (
    <div className="h-80 w-full px-0 py-2 sm:px-12 sm:pt-4 lg:px-24 2xl:px-36">
      <div className="bg-nice-red flex h-full w-full flex-col items-center justify-start gap-2 overflow-hidden! py-4 pr-2 sm:flex-row sm:rounded-xl sm:pl-0.5">
        <div className="flex h-fit w-full flex-col items-center justify-between gap-4 pt-1 pb-0 sm:h-full sm:w-48 sm:pt-10! sm:pr-2 sm:pb-4">
          <UiP variant="style_2" className="mx-auto">
            شگفت انگیز
          </UiP>
          <UiLink
             href={PRODUCT_COLLECTIONS.amazing.href}
            variant="style_2"
          >
            مشاهده بیشتر
          </UiLink>
        </div>
        <div className="bg-nice-red h-auto w-full min-w-0 flex-1 overflow-hidden!">
          {isLoading ? (
            <div className="h-full w-full">
              <Skeleton className="h-64 w-20 bg-gray-200" />
            </div>
          ) : (
            <UiCarousel
              className="h-full w-full"
              options={{ loop: true, direction: 'rtl', slidesToScroll: 1 }}
              autoplay={{ delay: 3000 }}
              controls="none"
              labels={{ carousel: 'محصولات' }}
              containerClassName="h-full"
              slideClassName="h-64 basis-32 px-1 sm:basis-44"
            >
              {amazingProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </UiCarousel>
          )}
        </div>
      </div>
    </div>
  );
};
