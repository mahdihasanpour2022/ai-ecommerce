import ProductSizes from '@/features/product-sizes/components/product-sizes';

import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'مدیریت سایزها',
  description: 'ایجاد، ویرایش و حذف سایزهای محصولات',
};

export default function ProductSizesPage() {
  return <ProductSizes />;
}
