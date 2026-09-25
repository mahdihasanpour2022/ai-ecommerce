import { UiImage, UiP } from '@/components/shared/ui';
import { Product } from '@/features/home/interfaces/product';
import ProductPrice from './productPrice';

interface Props {
  product: Product;
}

const ProductCard = ({ product }: Props) => {
  return (
    <div className="flex h-64 w-full! flex-col items-center justify-start rounded-t-lg! bg-white overflow-hidden">
      <UiImage
        key={product.id}
        src={product.image}
        alt={product.alt}
        width={500}
        height={500}
        className="h-44! w-full! bg-center! object-contain!"
        preload
      />
      <div className="flex h-full w-full flex-col items-center justify-center gap-0 px-2 pb-1">
        <UiP variant="style_1" className="text-[14px]! whitespace-normal pb-1 wrap-break-word h-10 leading-4!" title={product.alt}>
          {product.name}
        </UiP>
        <ProductPrice product={product} />
      </div>
    </div>
  );
};

export default ProductCard;
