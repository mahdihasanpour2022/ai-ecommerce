import { Skeleton } from '@/components/shared';
import { UiCarousel, UiLink, UiP } from '@/components/shared/ui';
import { CollectionProductCard } from '@/features/components/shared';
import { Category } from '@/features/products/product/interfaces/productById';
import { useGetProducts } from '@/hooks/shared/useGetProducts';
import { Product } from '@/interfaces/product';

interface Props {
  category: Category;
}

export const RelatedProducts = ({ category }: Props) => {
  const { data, isLoading } = useGetProducts({
    categories: [category?.id],
    enabled: true,
  });

  const products: readonly Product[] | [] = data?.result ?? [];

  return (
    <section className="w-full">
      {isLoading ? (
        <Skeleton className="w-full rounded-2xl md:h-80" />
      ) : (
        products.length > 0 && (
          <div className="border-foreground/10 flex w-full flex-col items-start justify-center gap-4 rounded-2xl border px-6 py-6">
            <div className="flex h-auto w-full items-start justify-between gap-4">
              <div className="flex flex-col items-start justify-start gap-2">
                <UiP variant="style_3" className="">
                  {category.name}
                </UiP>
              </div>
              <UiLink href={`/products?categories=${category.id}`}>مشاهده بیشتر</UiLink>
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
                  key={product.id}
                  product={product}
                  className={{
                    wrapper:
                      'border-foreground/10 flex h-64 w-full! flex-col items-center justify-start overflow-hidden rounded-t-lg! rounded-b-xl border bg-white px-1 py-1 sm:px-1! sm:py-1!',
                  }}
                />
              ))}
            </UiCarousel>
          </div>
        )
      )}
    </section>
  );
};
