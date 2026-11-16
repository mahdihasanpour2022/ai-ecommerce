import ProductTags from '@/features/product-tags/components/product-tags';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'مدیریت تگ‌ها',
  description: 'ایجاد، ویرایش و حذف برچسب‌های محصولات',
};

export default function ProductTagsPage() {
  return <ProductTags />;
}
