import type { ProductListQuery } from '../../app/catalog/catalog-api';

export const catalogQueryKeys = {
  all: ['catalog'] as const,
  categories: () => ['catalog', 'categories'] as const,
  productLists: () => ['catalog', 'products'] as const,
  products: (query: ProductListQuery = {}) => ['catalog', 'products', query] as const,
  productDetails: () => ['catalog', 'product'] as const,
  product: (productId: string) => ['catalog', 'product', productId] as const,
  priceDisplaySetting: () => ['catalog', 'settings', 'price-display-unit'] as const,
};
