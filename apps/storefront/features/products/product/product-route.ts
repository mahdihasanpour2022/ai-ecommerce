export const getProductHref = (productId: string, productName: string) =>
  `/products/${encodeURIComponent(productId)}/${encodeURIComponent(productName.trim())}`;
