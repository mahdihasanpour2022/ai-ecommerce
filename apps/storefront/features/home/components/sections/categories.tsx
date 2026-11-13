import { UiButton, UiImage, UiSpan } from '@/components/shared/ui';
import { nanoid } from 'nanoid';

import { Skeleton } from '@/components/shared';
import { useGetCategories } from '@/features/home/hooks/useGetCategories';
import { useMemo } from 'react';
import { useRouter } from 'nextjs-toploader/app';

export const Categories = () => {
  const router = useRouter();
  const { data, isPending, isLoading } = useGetCategories();

  const categories = useMemo(() => {
    return data?.result ?? [];
  }, [data?.result]);

  const handler = (categoryId: string) => {
    const nextSearchParams = new URLSearchParams({ categories: categoryId });
    router.replace(`/products?${nextSearchParams.toString()}`, { scroll: false });
  };

  return (
    <div className="flex w-full flex-wrap items-center justify-center gap-0! px-6 sm:gap-3 sm:px-12 sm:pt-2 lg:px-24 2xl:px-36">
      {(isPending || isLoading || categories.length === 0) && (
        <div className="flex items-center justify-center gap-4">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-16! w-16! rounded-lg sm:h-24! sm:w-24!" />
          ))}
        </div>
      )}

      {categories.map((category) => (
        <UiButton
          key={nanoid()}
          className="flex h-fit w-fit! flex-col items-center justify-center gap-0 px-2! sm:gap-1 sm:px-4!"
          onClick={() => handler(category.id)}
        >
          <UiImage
            alt={category.name}
            src={category.src}
            className="h-16! w-16! rounded-lg bg-contain bg-center sm:h-24! sm:w-24!"
            width={350}
            height={350}
          />
          <UiSpan variant="style_2" className="">
            {category.name}
          </UiSpan>
        </UiButton>
      ))}
    </div>
  );
};
