import { SuggestedProductCard } from './subsets/suggestedProductCard';

import { Skeleton } from '@/components/shared';
import { UiP } from '@/components/shared/ui';
import { useGetProducts } from '@/features/home/hooks/useGetProducts';
import { nanoid } from 'nanoid';
import { useMemo } from 'react';

export const OurSuggestion = () => {
  const { data, isLoading } = useGetProducts({ tags: ['our_suggest'] });

  const ourSuggestProducts = useMemo(() => {
    return data?.result ?? [];
  }, [data?.result]);

  return (
    <section className="grid h-fit w-full px-6 sm:px-12 sm:py-8 lg:px-24 2xl:px-36">
      <UiP variant="style_4">پیشنهاد ما</UiP>
      {isLoading ? (
        <div className="h-64 w-full">
          <Skeleton className="h-full w-full bg-gray-200" />
        </div>
      ) : (
        <div className="grid h-fit w-full grid-cols-5 gap-0">
          {ourSuggestProducts.map((product) => (
            <SuggestedProductCard key={nanoid()} product={product} />
          ))}
        </div>
      )}
    </section>
  );
};
