import { UiImage, UiP } from '@/components/shared/ui';
import { Product } from '@/features/home/interfaces/product';
import ProductPrice from './productPrice';

interface Props {
  product: Product;
}

const ProductCard = ({ product }: Props) => {
  return (
    <div className="flex h-64 w-full! flex-col items-center justify-start overflow-hidden rounded-t-lg! bg-white">
      <UiImage
        key={product.id}
        src={product.image}
        alt={product.alt}
        width={500}
        height={500}
        className="h-auto! w-full! bg-center! object-contain! sm:h-44!"
        preload
      />
      <div className="flex h-full w-full flex-col items-center justify-start gap-0 px-2 pb-1">
        <UiP
          variant="style_1"
          className="h-10! pb-1 text-xs wrap-break-word whitespace-normal sm:h-full! sm:text-[14px]! sm:leading-4!"
          title={product.alt}
        >
          {product.name}
        </UiP>
        <ProductPrice product={product} />
      </div>
    </div>
  );
};

export default ProductCard;
