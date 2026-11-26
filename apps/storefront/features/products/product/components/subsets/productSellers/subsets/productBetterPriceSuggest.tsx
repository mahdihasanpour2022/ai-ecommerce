import { UiImage, UiSpan } from '@/components/shared/ui';
import priceTag from '@/public/assets/product/seller/price-tag-icon.webp';

export const ProductBetterPriceSuggest = () => {
  return (
    <div className="flex w-full items-center justify-end gap-1">
      <UiSpan className="text-2xs w-fit! font-medium!" variant="style_6">
        قیمت بهتری سراغ دارید؟
      </UiSpan>
      <UiImage
        src={priceTag}
        className="h-4! w-4! sm:h-5! sm:w-5!"
        alt="shop-guarantee-icon"
        width={350}
        height={350}
        unoptimized={true}
      />
    </div>
  );
};
