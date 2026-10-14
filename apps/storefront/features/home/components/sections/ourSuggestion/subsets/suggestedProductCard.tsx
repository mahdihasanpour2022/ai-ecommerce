import { UiButton, UiImage, UiP, UiSpan } from '@/components/shared/ui';
import ProductPrice from '@/features/components/shared/productPrice';
import { Product } from '@/interfaces/product';

export const SuggestedProductCard = ({ product }: { product: Product }) => {
  const { name, description, image, alt } = product;

  return (
    <UiButton variant='style_4' className="border-foreground/5 border">

      <UiImage alt={alt} src={image} width={400} height={400} className="h-auto w-full bg-center bg-cover border!" />

      <div className="flex h-fit w-full! flex-col items-start justify-center gap-1 overflow-hidden px-4 pb-4">
        <UiP
          variant="style_1"
          className="h-10! pb-1 text-xs wrap-break-word whitespace-normal sm:h-full! sm:text-[14px]! sm:leading-4!"
          title={alt}
        >
          {name}
        </UiP>
        <UiSpan variant="style_6" className="h-10">
          {description}
        </UiSpan>
        <ProductPrice product={product} />
      </div>
    </UiButton>
  );
};
