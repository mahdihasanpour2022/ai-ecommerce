'use client';

import { useGetProductById } from '../hooks/useGetProductById';
import { ProductByID, Variants } from '../interfaces/productById';
import { ProductDescription } from './subsets/productDescription';
import { ProductImage } from './subsets/productImage';
interface ProductProps {
  readonly productId: string;
}

export const Product = ({ productId }: ProductProps) => {
  const { data } = useGetProductById({ productId });

  const currentProduct: ProductByID | undefined = data?.singleResult ?? undefined;
  const selectedVariant: Variants | undefined = currentProduct?.variants[0];

  return (
    <>
      {currentProduct && (
        <section className="border-foreground flex h-fit w-full items-stretch justify-between gap-3 px-6 pt-16 pb-5 sm:px-12 sm:pt-8 lg:px-24 2xl:px-36">
          <div className="flex w-4/5 items-start justify-between gap-4">
            <ProductImage
              productId={productId}
              selectedVariant={selectedVariant}
              currentProduct={currentProduct}
            />
            <ProductDescription currentProduct={currentProduct} selectedVariant={selectedVariant} />
          </div>
          <div className="w-1/5 border"></div>
        </section>
      )}
    </>
  );
};
