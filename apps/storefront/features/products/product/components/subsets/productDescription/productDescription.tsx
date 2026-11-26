import { Seperator } from '@/components/shared';
import { UiButton, UiSpan } from '@/components/shared/ui';

import {
  ProductColor,
  ProductMainSpecs,
  ProductSize,
} from '@/features/products/product/components/subsets';
import yellowStar from '@/public/assets/product/star-yellow.webp';
import Image from 'next/image';
import { ProductByID, Variants } from '../../../interfaces/productById';

interface Props {
  currentProduct: ProductByID;
  selectedVariant: Variants | undefined;
}

export const ProductDescription = ({ currentProduct, selectedVariant }: Props) => {
  return (
    <div className="border-foreground/10 w-full rounded-xl border px-4 pb-8 md:w-1/2">
      <h1 id="product-title" className="text-foreground/90 pt-4 pb-2 text-xl font-medium">
        {currentProduct.name}
      </h1>
      <Seperator className="my-0!" />
      <div className="flex items-center justify-start gap-2 py-1">
        {/* star  */}
        <div className="flex items-center justify-start gap-1 pt-2">
          <Image src={yellowStar} alt="" width={16} height={16} className="h-4 w-4" />
          {/* rate  */}
          <UiSpan variant="style_8" className="">
            3.9
          </UiSpan>
          <UiSpan variant="style_6" className="whitespace-nowrap">
            {`(امتیاز 14 خریدار)`}
          </UiSpan>
          {/* comment count */}
          <UiButton type="button" className="mr-2" variant="style_8" size="x-small">
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
