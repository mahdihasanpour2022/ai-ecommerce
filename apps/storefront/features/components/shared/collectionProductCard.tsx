import { UiButton, UiImage, UiP, UiSpan } from '@/components/shared/ui';
import { ProductPrice } from '@/features/components/shared/productPrice';
import { Product } from '@/interfaces/product';

export const CollectionProductCard = ({ product }: { product: Product }) => {
  const { name, description, image, alt } = product;

  return (
    <UiButton
      variant="style_4"
      className="border-foreground/5 flex h-full! flex-col items-stretch border px-2!"
    >
      <UiImage
        alt={alt}
        src={image}
        width={400}
        height={400}
        className="aspect-square h-auto w-full border! bg-center object-cover"
      />

      <div className="flex w-full! flex-1 flex-col items-start overflow-hidden pb-4">
        <div className="w-full space-y-1 pt-2">
          <UiP
            variant="style_1"
            className="line-clamp-2 py-0! text-start text-xs wrap-break-word whitespace-normal sm:text-[14px]! sm:leading-4!"
            title={alt}
          >
            {name}
          </UiP>
          <UiSpan variant="style_6" className="line-clamp-2 text-start">
            {description}
          </UiSpan>
        </div>
        <ProductPrice product={product} />
      </div>
    </UiButton>
  );
};
