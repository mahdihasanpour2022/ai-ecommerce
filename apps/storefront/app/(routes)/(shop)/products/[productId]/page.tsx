import { getProductHref } from '@/features/products/product/product-route';
import { getProductById } from '@/features/products/product/server/get-product-by-id';
import { permanentRedirect } from 'next/navigation';

type ProductPageProps = PageProps<'/products/[productId]'>;

const ProductPage = async ({ params }: ProductPageProps) => {
  const { productId } = await params;
  const product = (await getProductById(productId)).singleResult;

  permanentRedirect(getProductHref(productId, product.name));
};

export default ProductPage;
