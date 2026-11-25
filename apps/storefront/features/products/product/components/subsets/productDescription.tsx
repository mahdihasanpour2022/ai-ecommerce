import { Seperator } from '@/components/shared';
import { UiButton, UiP, UiSpan } from '@/components/shared/ui';

import yellowStar from '@/public/assets/product/star-yellow.webp';
import Image from 'next/image';
import { ProductByID, Variants } from '../../interfaces/productById';
import { ProductColor } from './productColor';
import { ProductMainSpecs } from './productMainSpecs';
import { ProductSize } from './productSize';

interface Props {
  currentProduct: ProductByID | undefined;
  selectedVariant: Variants | undefined;
}

export const ProductDescription = ({ currentProduct, selectedVariant }: Props) => {
  return (
    <div className="border-foreground/10 w-1/2 rounded-xl border px-4">
      <UiP variant="style_6" className="pt-2 pb-2!">
        {currentProduct?.name}
      </UiP>
      <Seperator className="my-0!" />
      <div className="flex items-center justify-start gap-2 py-1">
        {/* star  */}
        <div className="flex items-center justify-start gap-1">
          <Image
            src={yellowStar}
            alt="yellow-star-icon"
            width={150}
            height={150}
            className="h-4 w-4"
            unoptimized={true}
          />
          {/* rate  */}
          <UiSpan variant="style_8" className="">
            3.9
          </UiSpan>
          <UiSpan variant="style_6" className="whitespace-nowrap">
            {`(امتیاز 14 خریدار)`}
          </UiSpan>
          {/* comment count */}
          <UiButton className="mr-2" variant="style_8" size="x-small">
            {`6 دیدگاه >`}
          </UiButton>
        </div>
      </div>
      <ProductColor currentProduct={currentProduct} selectedVariant={selectedVariant} />
      <ProductSize currentProduct={currentProduct} selectedVariant={selectedVariant} />
      <ProductMainSpecs currentProduct={currentProduct} />
    </div>
  );
};
