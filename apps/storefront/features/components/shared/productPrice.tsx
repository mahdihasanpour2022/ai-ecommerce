import { UiImage, UiSpan } from '@/components/shared/ui';
import { Product } from '@/interfaces/product';
// import rial from '@/public/assets/currency/rial.svg';
import toman from '@/public/assets/currency/toman.svg';

export const ProductPrice = ({ product }: { product: Product }) => {
  const { final_price, original_price, discount, currency } = product;
  return (
    <div className="flex h-fit w-full flex-col items-end justify-center">
      <div className="flex items-center justify-end gap-2">
        {discount > 0 && (
          <UiSpan variant="style_4" className="">
            %{discount}
          </UiSpan>
        )}
        <UiSpan variant="style_3" className="">
          {original_price.toLocaleString()}
        </UiSpan>
      </div>
      <div className="flex h-full w-full items-center justify-end gap-1">
        <UiSpan variant="style_5" className="">
          {final_price.toLocaleString()}
        </UiSpan>
        <div className="opacity-90">
          <UiImage
            src={toman}
            alt={currency}
            width={300}
            height={300}
            className="h-4! w-4! sm:h-5! sm:w-5!"
          />
        </div>
      </div>
    </div>
  );
};
