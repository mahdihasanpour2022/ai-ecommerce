import { UiImage, UiSpan } from '@/components/shared/ui';
import amazedUserIcon from '@/public/assets/product/seller/amazed-user-icon.webp';

export const ProductBestPrice = () => {
  return (
    <div className="flex items-center justify-start gap-2 py-1">
      <UiImage
        src={amazedUserIcon}
        className="h-4! w-4! sm:h-5! sm:w-5!"
        alt="amazed-user-icon"
        width={350}
        height={350}
        unoptimized={true}
      />
      <UiSpan className="" variant="style_13">
        بهترین قیمت در 30 روز گذشته
      </UiSpan>
    </div>
  );
};
