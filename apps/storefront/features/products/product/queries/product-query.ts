const productRootKey = ['product-by-id'] as const;

export const productKeys = {
  all: productRootKey,
  detail: (productId: string) => [...productRootKey, productId] as const,
};

export const PRODUCT_STALE_TIME_MS = 3 * 60 * 1_000;
