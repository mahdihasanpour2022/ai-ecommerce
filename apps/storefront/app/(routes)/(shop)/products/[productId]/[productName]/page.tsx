import { Product } from '@/features/products/product/components/product';
import { getProductHref } from '@/features/products/product/product-route';
import {
  PRODUCT_STALE_TIME_MS,
  productKeys,
} from '@/features/products/product/queries/product-query';
import { getProductById } from '@/features/products/product/server/get-product-by-id';
import { createStorefrontQueryClient } from '@/providers/storefront-query-client';
import { dehydrate, HydrationBoundary, noop } from '@tanstack/react-query';
import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';

type ProductPageProps = PageProps<'/products/[productId]/[productName]'>;

const getProduct = async (productId: string) => {
  try {
    return (await getProductById(productId)).singleResult;
  } catch {
    return null;
  }
};

export const generateMetadata = async ({ params }: ProductPageProps): Promise<Metadata> => {
  const { productId, productName } = await params;
  const product = await getProduct(productId);

  return {
    title: product?.name ?? productName,
    description: product?.description ?? 'مشاهده جزئیات محصول',
  };
};

const ProductPage = async ({ params }: ProductPageProps) => {
  const { productId, productName } = await params;
  const queryClient = createStorefrontQueryClient();

  const response = await queryClient
    .query({
      queryKey: productKeys.detail(productId),
      queryFn: () => getProductById(productId),
      staleTime: PRODUCT_STALE_TIME_MS,
    })
    .catch(noop);

  const product = response?.singleResult;
  if (product && productName !== product.name) {
    permanentRedirect(getProductHref(productId, product.name));
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Product productId={productId} />
    </HydrationBoundary>
  );
};

export default ProductPage;
