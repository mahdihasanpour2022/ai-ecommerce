import { UiButton, UiCarousel, UiP, UiSpan } from '@/components/shared/ui';
import {ProductCard} from '@/features/components/shared/productCard';
import { products } from './amazingProducts/amazingProducts';

export const CapProducts = () => {
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
          <UiButton size="small" variant="style_5" className="">
            {`مشاهده همه`} <UiSpan variant="style_1" className="pr-2">{`>`}</UiSpan>{' '}
          </UiButton>
        </div>
        <UiCarousel
          className="h-full w-full"
          options={{ loop: true, direction: 'rtl', slidesToScroll: 1 }}
          autoplay={{ delay: 3000 }}
          controls="none"
          labels={{ carousel: 'محصولات' }}
          containerClassName="h-full"
          slideClassName="h-64 basis-32 px-1 sm:basis-44"
        >
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              containerClassName="border border-foreground/10 rounded-b-xl"
            />
          ))}
        </UiCarousel>
      </div>
    </section>
  );
};
