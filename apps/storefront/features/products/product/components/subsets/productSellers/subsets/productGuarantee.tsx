import { UiImage, UiSpan } from '@/components/shared/ui';
import shopGuarante from '@/public/assets/product/seller/shop-guarantee.webp';

export const ProductGuarantee = () => {
  return (
    <div className="flex w-full items-center justify-start gap-1 pt-2">
      <UiImage
        src={shopGuarante}
        className="h-4! w-4! sm:h-7! sm:w-7!"
        alt="shop-guarantee-icon"
        width={350}
        height={350}
        unoptimized={true}
      />
      <UiSpan className="font-medium!" variant="style_6">
        گارانتی اصالت و سلامت فیزیکی کالا
      </UiSpan>
    </div>
  );
};
