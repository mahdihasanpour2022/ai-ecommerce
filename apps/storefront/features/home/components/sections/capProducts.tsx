import { UiCarousel, UiLink, UiP, UiSpan } from '@/components/shared/ui';
import { PRODUCT_COLLECTIONS } from '@/constants/productCollections';
import { CollectionProductCard } from '@/features/components/shared';
import { useGetProducts } from '@/hooks/shared/useGetProducts';
import { nanoid } from 'nanoid';

export const CapProducts = () => {
  const { data } = useGetProducts({ tags: PRODUCT_COLLECTIONS.cap.tags, enabled: true });

  const products = data?.result ?? [];

  return (
    <section className="px w-full sm:px-12 sm:py-8 lg:px-24 2xl:px-36">
      <div className="border-foreground/10 flex w-full flex-col items-start justify-center gap-4 rounded-2xl border px-6 py-6">
        <div className="flex h-auto w-full items-start justify-between gap-4">
          <div className="flex flex-col items-start justify-start gap-2">
            <UiP variant="style_3" className="">
              کلاه زنانه و مردانه
            </UiP>
            <UiSpan variant="style_2" className="">
              بر اساس سلیقه شما
            </UiSpan>
          </div>
          <UiLink href={PRODUCT_COLLECTIONS.cap.href}>مشاهده بیشتر</UiLink>
        </div>
        <UiCarousel
          className="h-full w-full"
          options={{ loop: true, direction: 'rtl', slidesToScroll: 1 }}
          autoplay={{ delay: 3000 }}
          controls="none"
          labels={{ carousel: 'محصولات' }}
          containerClassName="h-full"
          slideClassName="h-72 basis-32 px-1 sm:basis-44"
        >
          {products.map((product) => (
            <CollectionProductCard
              key={nanoid()}
              product={product}
              className={{
                wrapper:
                  'border-foreground/10 flex h-64 w-full! flex-col items-center justify-start overflow-hidden rounded-t-lg! rounded-b-xl border bg-white px-1 py-1 sm:px-1! sm:py-1!',
              }}
            />
          ))}
        </UiCarousel>
      </div>
    </section>
  );
};
