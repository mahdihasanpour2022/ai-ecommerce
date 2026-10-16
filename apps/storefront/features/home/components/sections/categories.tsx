import { UiButton, UiImage, UiSpan } from '@/components/shared/ui';
import { nanoid } from 'nanoid';

import { Skeleton } from '@/components/shared';
import { useGetCategories } from '@/features/home/hooks/useGetCategories';
import { useMemo } from 'react';

export const Categories = () => {
  const { data, isLoading } = useGetCategories();

  const categories = useMemo(() => {
    return data?.result ?? [];
  }, [data?.result]);

  return (
    <div className="flex w-full flex-wrap items-center justify-center gap-0! px-6 sm:gap-3 sm:px-12 sm:pt-2 lg:px-24 2xl:px-36">
      {isLoading ||
        (categories.length === 0 && (
          <div className="flex items-center justify-center gap-4">
            <Skeleton className="h-16! w-16! rounded-full sm:h-24! sm:w-24!" />
            <Skeleton className="h-16! w-16! rounded-full sm:h-24! sm:w-24!" />
            <Skeleton className="h-16! w-16! rounded-full sm:h-24! sm:w-24!" />
          </div>
        ))}

      {categories.map((category) => (
        <UiButton
          key={nanoid()}
          className="flex h-fit w-fit! flex-col items-center justify-center gap-0 px-2! sm:gap-1 sm:px-4!"
        >
          <UiImage
            alt={category.name}
            src={category.src}
            className="h-16! w-16! bg-contain bg-center sm:h-24! sm:w-24!"
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
