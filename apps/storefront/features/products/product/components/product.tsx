'use client';

import { Seperator } from '@/components/shared';
import {
  ProductDescription,
  ProductImage,
  ProductPreference,
  ProductRateComments,
  ProductSellers,
  ProductTabs,
  RelatedProducts,
} from '@/features/products/product/components/subsets';
import { useGetProductById } from '../hooks/useGetProductById';

interface ProductProps {
  readonly productId: string;
}

export const Product = ({ productId }: ProductProps) => {
  const { data, isPending } = useGetProductById({ productId });

  const currentProduct = data?.singleResult;

  if (isPending) {
    return (
      <p role="status" aria-live="polite" className="px-6 py-16 text-center">
        در حال بارگذاری محصول…
      </p>
    );
  }

  if (!currentProduct) {
    return (
      <p role="alert" className="text-foreground/50 px-6 py-16 text-center">
        اطلاعات محصول در دسترس نیست.
      </p>
    );
  }

  const selectedVariant = currentProduct.variants[0];

console.log("product-data :",data);

  return (
    <article
      aria-labelledby="product-title"
      className="flex flex-col items-center justify-center gap-4 px-6 pt-16 pb-5 sm:px-12 sm:pt-8 lg:px-24 2xl:px-36"
    >
      <div className="border-foreground flex h-fit w-full flex-col items-stretch justify-between gap-3 lg:flex-row">
        <div className="flex w-full flex-col items-start justify-between gap-4 md:flex-row lg:w-4/5">
          <ProductImage
            productId={productId}
            selectedVariant={selectedVariant}
            currentProduct={currentProduct}
          />
          <ProductDescription currentProduct={currentProduct} selectedVariant={selectedVariant} />
        </div>

        <ProductSellers product={currentProduct} />
      </div>
      <ProductPreference />
      <ProductTabs specifications={currentProduct.specifications} />
      <Seperator className="my-0! h-1!" />
      <RelatedProducts category={currentProduct.category} />
      <Seperator className="my-0! h-1!" />
      <ProductRateComments
        product={{
          id: currentProduct.id,
          name: currentProduct.name,
          image: selectedVariant?.image?.url ?? currentProduct.image,
          alt: currentProduct.alt,
        }}
      />
    </article>
  );
};
