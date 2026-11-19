import type { PaginatedApiResponse, ApiResponse } from '@/app/http/api-response';
import type { ProductByID } from '@/features/products/product/interfaces/productById';
import type { Product } from '@/interfaces/product';

export interface FavoriteMutationResult {
  readonly productId: string;
  readonly isFavorite: boolean;
}

export type FavoriteListResponse = PaginatedApiResponse<readonly Product[]>;
export type FavoriteMutationResponse = ApiResponse<null, FavoriteMutationResult, null>;
export type FavoriteProductResponse = ApiResponse<null, ProductByID, null>;

const favoriteRootKey = ['favorite'] as const;

export const favoriteKeys = {
  all: favoriteRootKey,
  lists: () => [...favoriteRootKey, 'list'] as const,
  list: (page: number, pageSize: number) =>
    [...favoriteRootKey, 'list', { page, pageSize }] as const,
  product: (productId: string) => [...favoriteRootKey, 'product', productId] as const,
};

const activeFavoriteRequests = new Map<string, Promise<unknown>>();

// درخواست هم‌زمان همان محصول را به Promise فعال وصل می‌کند تا پاسخ‌ها از ترتیب خارج نشوند.
export function runFavoriteSingleFlight<Result>(
  productId: string,
  request: () => Promise<Result>,
): Promise<Result> {
  const activeRequest = activeFavoriteRequests.get(productId);
  if (activeRequest) return activeRequest as Promise<Result>;

  const pendingRequest = request().finally(() => {
    if (activeFavoriteRequests.get(productId) === pendingRequest) {
      activeFavoriteRequests.delete(productId);
    }
  });
  activeFavoriteRequests.set(productId, pendingRequest);
  return pendingRequest;
}

// فقط وضعیت علاقه‌مندی محصول موجود در cache را بدون تغییر سایر داده‌های پاسخ عوض می‌کند.
export function withFavoriteStatus(
  response: FavoriteProductResponse | undefined,
  isFavorite: boolean,
): FavoriteProductResponse | undefined {
  if (!response) return undefined;
  return {
    ...response,
    singleResult: {
      ...response.singleResult,
      isFavorite,
    },
  };
}
