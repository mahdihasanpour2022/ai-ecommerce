import { Product } from '@/features/products/product/components/product';
import {
  PRODUCT_STALE_TIME_MS,
  productKeys,
} from '@/features/products/product/queries/product-query';
import { getProductById } from '@/features/products/product/server/get-product-by-id';
import { createStorefrontQueryClient } from '@/providers/storefront-query-client';
import { dehydrate, HydrationBoundary, noop } from '@tanstack/react-query';
import type { Metadata } from 'next';

type ProductPageProps = PageProps<'/products/[productId]'>;

const getProduct = async (productId: string) => {
  try {
    return (await getProductById(productId)).singleResult;
  } catch {
    return null;
  }
};

export const generateMetadata = async ({ params }: ProductPageProps): Promise<Metadata> => {
  const { productId } = await params;
  const product = await getProduct(productId);

  return {
    title: product?.name ?? 'محصول',
    description: product?.description ?? 'مشاهده جزئیات محصول',
  };
};

const ProductPage = async ({ params }: ProductPageProps) => {
  const { productId } = await params;
  const queryClient = createStorefrontQueryClient();

  await queryClient
    .query({
      queryKey: productKeys.detail(productId),
      queryFn: () => getProductById(productId),
      staleTime: PRODUCT_STALE_TIME_MS,
    })
    .catch(noop);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Product productId={productId} />
    </HydrationBoundary>
  );
};

export default ProductPage;
