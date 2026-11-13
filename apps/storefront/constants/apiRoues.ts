export const ApiRoutes = {
  home_banners: '/catalog/banners',
  categories: '/catalog/categories',
  products: '/catalog/products',
  productColors: '/catalog/product-options/colors',
  productSizes: '/catalog/product-options/sizes',
  productPriceRange: '/catalog/product-options/price-range',
  product: (productId: string) => `/catalog/products/${encodeURIComponent(productId)}`,
  banner_content: (bannerId: string) => `/catalog/banners/${encodeURIComponent(bannerId)}/content`,
} as const;
