'use client';

import { Skeleton } from '@/components/shared';
import { UiCarousel, UiImage } from '@/components/shared/ui';
import { useGetHomeBanners } from '@/features/home/hooks/useGetHomeBanners';
import { useMemo } from 'react';

export const TopSliders = () => {
  const { data, isLoading } = useGetHomeBanners();
  const banners = useMemo(() => {
    return data?.result ?? [];
  }, [data?.result]);

  return (
    <div className="h-fit w-full">
      {isLoading || banners.length === 0 ? (
        <Skeleton className="h-32 w-full sm:h-90!" />
      ) : (
        <UiCarousel
          className="h-32 w-full sm:h-90!"
          options={{ loop: true, direction: 'rtl' }}
          autoplay={{ delay: 5000 }}
          controls="both"
          labels={{ carousel: 'بنرهای صفحه اصلی' }}
        >
          {banners.map((banner, index) => (
            <UiImage
              key={banner.id}
              src={banner.src}
              alt={banner.alt ?? ''}
              width={banner.width}
              height={banner.height}
              sizes="100vw"
              className="h-32! w-full bg-center! object-cover! sm:h-90!"
              preload={index === 0}
            />
          ))}
        </UiCarousel>
      )}
    </div>
  );
};
