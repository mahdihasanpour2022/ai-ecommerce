import { Skeleton } from '@/components/shared';
import { UiImage, UiLink, UiP } from '@/components/shared/ui';
import { PRODUCT_COLLECTIONS } from '@/constants/productCollections';
import { useGetProducts } from '@/hooks/shared/useGetProducts';
import { nanoid } from 'nanoid';
import { useMemo } from 'react';

export const DiscountedProduct = () => {
  const { data, isLoading } = useGetProducts({
    tags: PRODUCT_COLLECTIONS.discounted.tags,
    enabled: true,
  });

  const discountedProducts = useMemo(() => {
    return data?.result ?? [];
  }, [data?.result]);

  return (
    <section className="h-auto w-full px-6 py-4 sm:grid-cols-2 sm:px-12 sm:py-4 lg:grid-cols-4 lg:px-24 2xl:px-36">
      <div className="flex items-center justify-between gap-4 pb-3">
        <UiP variant="style_4" className="pb-0">
          پر تخفیف‌ها
        </UiP>
        <UiLink href={PRODUCT_COLLECTIONS.discounted.href}>مشاهده بیشتر</UiLink>
      </div>
      {isLoading ? (
        <div className="grid h-auto w-full grid-cols-2 gap-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-64 w-full rounded-2xl bg-gray-200" />
          ))}
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
