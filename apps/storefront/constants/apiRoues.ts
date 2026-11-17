export const ApiRoutes = {
  home_banners: '/catalog/banners',
  categories: '/catalog/categories',
  products: '/catalog/products',
  productColors: '/catalog/product-options/colors',
  productSizes: '/catalog/product-options/sizes',
  productPriceRange: '/catalog/product-options/price-range',
  product: (productId: string) => `/catalog/products/${encodeURIComponent(productId)}`,
  banner_content: (bannerId: string) => `/catalog/banners/${encodeURIComponent(bannerId)}/content`,
  customerAuth: {
    bootstrap: '/customer-auth/bootstrap',
    flow: '/customer-auth/flow',
    logout: '/customer-auth/logout',
    register: '/customer-auth/register',
    requestOtp: '/customer-auth/otp/request',
    verifyOtp: '/customer-auth/otp/verify',
  },
} as const;
