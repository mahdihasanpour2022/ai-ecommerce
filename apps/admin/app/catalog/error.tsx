'use client';

import { CatalogState } from './catalog-state';

export default function CatalogError({ retry }: Readonly<{ retry: () => void }>) {
  return (
    <CatalogState
      kind="error"
      title="نمایش کاتالوگ ممکن نشد"
      message="خطایی ایمن هنگام نمایش این بخش رخ داد. لطفاً دوباره تلاش کنید."
      onRetry={retry}
    />
  );
}
