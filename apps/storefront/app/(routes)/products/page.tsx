import { ProductsCollection } from '@/features/products/collections/components/collections';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'جستجوی محصولات',
  description: 'جستجو در میان محصولات فروشگاه',
};

const normalizedName = (value: string | string[] | undefined): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const name = value.normalize('NFKC').trim().replace(/\s+/gu, ' ');
  return name.length > 0 && Array.from(name).length <= 200 ? name : undefined;
};

const ProductsPage = async ({ searchParams }: PageProps<'/products'>) => {
  const name = normalizedName((await searchParams).name);

  return (
    <ProductsCollection
      title={name ? `نتایج جستجوی «${name}»` : 'همه محصولات'}
      description={
        name
          ? 'محصولاتی که نام آن‌ها شامل عبارت جستجو است.'
          : 'تمام محصولات فعال فروشگاه را مشاهده کنید.'
      }
      {...(name ? { name } : {})}
    />
  );
};

export default ProductsPage;
