import ProductColors from '@/features/product-colors/components/product-colors';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'مدیریت رنگ‌ها',
  description: 'ایجاد، ویرایش و حذف رنگ‌های محصولات',
};
export default function ProductColorsPage() {
  return <ProductColors />;
}
