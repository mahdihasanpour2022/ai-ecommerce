import { UiImage, UiP } from '@/components/shared/ui';
import ProductPrice from '@/features/components/shared/productPrice';
import { Product } from '@/interfaces/product';
import clsx from 'clsx';

interface Props {
  product: Product;
  containerClassName?: string;
}

const ProductCard = ({ product, containerClassName }: Props) => {
  const { id, alt, image, name } = product;
  return (
    <div
      className={clsx(
        'flex h-64 w-full! flex-col items-center justify-start overflow-hidden rounded-t-lg! bg-white',
        containerClassName,
      )}
    >
      <UiImage
        key={id}
        src={image}
        alt={alt}
        width={500}
        height={500}
        className="h-auto! w-full! bg-center! object-contain! sm:h-44!"
        preload
      />
      <div className="flex h-full w-full flex-col items-center justify-start gap-0 px-2 pb-1">
        <UiP
          variant="style_1"
          className="h-10! pb-1 text-xs wrap-break-word whitespace-normal sm:h-full! sm:text-[14px]! sm:leading-4!"
          title={alt}
        >
          {name}
        </UiP>
        <ProductPrice product={product} />
      </div>
    </div>
  );
};

export default ProductCard;
