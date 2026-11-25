import { UiP, UiSpan } from '@/components/shared/ui';
import whiteTick from '@/public/assets/product/white-tick-icon.webp';
import Image from 'next/image';
import { Fragment } from 'react/jsx-runtime';
import { ProductByID, Variants } from '../../interfaces/productById';

interface Props {
  selectedVariant: Variants | undefined;
  currentProduct: ProductByID | undefined;
}

export const ProductColor = ({ selectedVariant, currentProduct }: Props) => {
  const colors = [
    ...new Set(
      currentProduct?.variants.flatMap(({ color }) => (color === null ? [] : [color])) ?? [],
    ),
  ];

  return (
    <Fragment>
      <UiP className="flex items-center justify-start gap-2 pt-6" variant="style_7">
        <UiSpan className="" variant="style_10">
          رنگ :
        </UiSpan>
        <UiSpan className="" variant="style_10">
          {selectedVariant?.color?.persianColorName}
        </UiSpan>
        <UiSpan
          style={{ background: selectedVariant?.color?.englishColorName }}
          className="h-3 w-3"
          variant="style_11"
        />
      </UiP>
      <div className="flex items-center justify-start gap-3 py-4">
        {colors?.map((color, index) => (
          <UiSpan
            key={`${color}-${index}`}
            style={{ background: color.englishColorName }}
            variant="style_11"
            className={`outline-foreground/10 flex h-6 w-6 items-center justify-center text-white outline-4 ${selectedVariant?.color === color ? 'ring-4 ring-blue-300 outline-0!' : ''}`}
          >
            {selectedVariant?.color === color && (
              <Image
                src={whiteTick}
                alt="white-tick-icon"
                width={300}
                height={300}
                className="h-3 w-3"
              />
            )}
          </UiSpan>
        ))}
      </div>
    </Fragment>
  );
};
