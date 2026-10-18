import {
  getProductCollectionBySlug,
  PRODUCT_COLLECTIONS,
} from '@/constants/productCollections';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductsCollection } from '../../../../features/products/collections/components/collections';

type ProductsPageProps = PageProps<'/products/[collection]'>;

export const dynamicParams = false;

export const generateStaticParams = () => {
  return Object.values(PRODUCT_COLLECTIONS).map(({ slug }) => ({ collection: slug }));
};

const getCollection = (collection: string) => {
  const config = getProductCollectionBySlug(collection);
  if (!config) notFound();
  return config;
};

export const generateMetadata = async ({ params }: ProductsPageProps): Promise<Metadata> => {
  const { collection } = await params;
  const config = getCollection(collection);

  return { title: config.title, description: config.description };
};

const ProductsPage = async ({ params }: ProductsPageProps) => {
  const { collection } = await params;
  const config = getCollection(collection);

  return <ProductsCollection {...config} />;
};

export default ProductsPage;
