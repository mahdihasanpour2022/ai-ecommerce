import { Skeleton } from '@/components/shared';
import { UiLink, UiP } from '@/components/shared/ui';
import { PRODUCT_COLLECTIONS } from '@/constants/productCollections';
import { CollectionProductCard } from '@/features/components/shared';
import { useGetProducts } from '@/features/home/hooks/useGetProducts';
import { nanoid } from 'nanoid';
import { useMemo } from 'react';

export const OurSuggestion = () => {
  const { data, isLoading } = useGetProducts({ tags: PRODUCT_COLLECTIONS.ourSuggest.tags });

  const ourSuggestProducts = useMemo(() => {
    return data?.result ?? [];
  }, [data?.result]);

  return (
    <section className="grid h-fit w-full px-6 sm:px-12 sm:py-8 lg:px-24 2xl:px-36">
      <div className="flex h-fit w-full items-center justify-between gap-2 pb-3">
        <UiP variant="style_4" className="pb-0!">
          پیشنهاد ما
        </UiP>
        <UiLink href={PRODUCT_COLLECTIONS.ourSuggest.href}>مشاهده بیشتر</UiLink>
      </div>
      {isLoading ? (
        <div className="h-64 w-full">
          <Skeleton className="h-full w-full bg-gray-200" />
        </div>
      ) : (
        <div className="grid h-fit w-full grid-cols-5 gap-0">
          {ourSuggestProducts.map((product) => (
            <CollectionProductCard key={nanoid()} product={product} />
          ))}
        </div>
      )}
    </section>
  );
};
