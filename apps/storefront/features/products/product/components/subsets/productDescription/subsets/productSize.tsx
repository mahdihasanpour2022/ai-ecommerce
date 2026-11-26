import { UiP, UiSpan } from '@/components/shared/ui';
import blueTick from '@/public/assets/product/blue-tick-icon.webp';
import { toEnglishDigits } from '@/utils/toEnglishDigits';
import clsx from 'clsx';
import Image from 'next/image';
import { Fragment } from 'react/jsx-runtime';
import { ProductByID, Variants } from '../../../../interfaces/productById';

interface Props {
  currentProduct: ProductByID | undefined;
  selectedVariant: Variants | undefined;
}

export const ProductSize = ({ currentProduct, selectedVariant }: Props) => {
  const sizes = [
    ...new Set(currentProduct?.variants.flatMap(({ size }) => (size === null ? [] : [size])) ?? []),
  ];

  return (
    <Fragment>
      <UiP className="flex items-center justify-start gap-2 pt-6" variant="style_7">
        <UiSpan className="" variant="style_10">
          سایز :
        </UiSpan>
        <UiSpan variant="style_10" className="font-mono font-normal!">
          {selectedVariant?.size ? toEnglishDigits(selectedVariant.size) : null}
        </UiSpan>
      </UiP>

      <div className="flex items-center justify-start gap-1 py-4">
        {sizes?.map((size) => (
          <div
            className={clsx(
              'flex items-start justify-between gap-0 rounded-xl border p-1',
              selectedVariant?.size === size ? 'border-2 border-blue-300' : 'border-foreground/20',
            )}
            key={size}
          >
            <Image
              src={blueTick}
              alt="green-tick-icon"
              width={300}
              height={300}
              className={clsx(
                'h-3 w-4 opacity-75',
                selectedVariant?.size !== size ? 'hidden!' : 'flex-initial!',
              )}
            />
            <UiSpan
              key={size}
              variant="style_12"
              className={clsx(
                'outline-foreground/20 flex w-fit items-center justify-center font-mono',
              )}
            >
              {size}
            </UiSpan>
          </div>
        ))}
      </div>
    </Fragment>
  );
};
