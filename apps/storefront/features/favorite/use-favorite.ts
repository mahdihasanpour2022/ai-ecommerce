'use client';

import type { StorefrontHttpError } from '@/app/http/http-client';
import { ApiRoutes } from '@/constants/apiRoues';
import { productKeys } from '@/features/products/product/queries/product-query';
import { useRQDeleter } from '@/hooks/rq_hooks/useRQDeleter';
import { useRQFetcher } from '@/hooks/rq_hooks/useRQFetcher';
import type { RQSenderOptions } from '@/hooks/rq_hooks/useRQSender';
import { useRQSender } from '@/hooks/rq_hooks/useRQSender';
import type { UseMutationResult } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import type {
  FavoriteListResponse,
  FavoriteMutationResponse,
  FavoriteProductResponse,
} from './favorite';
import { favoriteKeys, runFavoriteSingleFlight, withFavoriteStatus } from './favorite';

interface FavoriteListParams {
  readonly page?: number;
  readonly pageSize?: number;
  readonly enabled?: boolean;
}

interface FavoriteMutationContext {
  readonly previousProduct: FavoriteProductResponse | undefined;
}

interface FavoriteMutationState {
  readonly data: FavoriteMutationResponse | undefined;
  readonly error: StorefrontHttpError | null;
  readonly isError: boolean;
  readonly isPending: boolean;
  readonly isSuccess: boolean;
  readonly mutateFavorite: () => Promise<FavoriteMutationResponse>;
  readonly reset: () => void;
}

// فهرست محافظت‌شده را با کلید شامل تمام پارامترهای صفحه‌بندی دریافت می‌کند.
export function useGetFavorites({
  page = 1,
  pageSize = 24,
  enabled = true,
}: FavoriteListParams = {}) {
  return useRQFetcher<FavoriteListResponse>({
    queryKey: favoriteKeys.list(page, pageSize),
    url: ApiRoutes.favorite,
    enabled,
    axiosConfig: {
      customerAuth: { refreshEligible: true },
      params: { page, pageSize },
    },
  });
}

// چرخه optimistic، rollback و همگام‌سازی نهایی cache محصول را برای هر دو mutation آماده می‌کند.
function useFavoriteMutationOptions(
  productId: string,
  isFavorite: boolean,
  method: 'delete' | 'post',
): RQSenderOptions<FavoriteMutationResponse, void, FavoriteMutationContext> {
  const queryClient = useQueryClient();
  const productQueryKey = productKeys.detail(productId);
  return {
    mutationKey: favoriteKeys.product(productId),
    request: {
      method,
      url: ApiRoutes.favoriteProduct(productId),
      axiosConfig: {
        customerAuth: { csrf: true, refreshEligible: true },
      },
    },
    async onMutate(): Promise<FavoriteMutationContext> {
      await queryClient.cancelQueries({ queryKey: productQueryKey, exact: true });
      const previousProduct = queryClient.getQueryData<FavoriteProductResponse>(productQueryKey);
      queryClient.setQueryData<FavoriteProductResponse>(productQueryKey, (current) =>
        withFavoriteStatus(current, isFavorite),
      );
      return { previousProduct };
    },
    onError(
      _error: StorefrontHttpError,
      _variables: void,
      context: FavoriteMutationContext | undefined,
    ) {
      queryClient.setQueryData(productQueryKey, context?.previousProduct);
    },
    async onSettled() {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: productQueryKey, exact: true }),
        queryClient.invalidateQueries({ queryKey: favoriteKeys.lists() }),
      ]);
    },
  };
}

// اجرای mutation را پشت قفل مشترک همان محصول قرار می‌دهد و فقط وضعیت موردنیاز مصرف‌کننده را برمی‌گرداند.
function useFavoriteMutationState(
  productId: string,
  mutation: UseMutationResult<
    FavoriteMutationResponse,
    StorefrontHttpError,
    void,
    FavoriteMutationContext
  >,
): FavoriteMutationState {
  const mutateFavorite = useCallback(
    () => runFavoriteSingleFlight(productId, () => mutation.mutateAsync()),
    [productId, mutation],
  );

  return {
    data: mutation.data,
    error: mutation.error,
    isError: mutation.isError,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    mutateFavorite,
    reset: mutation.reset,
  };
}

export function useAddFavorite(productId: string): FavoriteMutationState {
  const mutation = useRQSender<FavoriteMutationResponse, void, FavoriteMutationContext>(
    useFavoriteMutationOptions(productId, true, 'post'),
  );
  return useFavoriteMutationState(productId, mutation);
}

export function useRemoveFavorite(productId: string): FavoriteMutationState {
  const mutation = useRQDeleter<FavoriteMutationResponse, void, FavoriteMutationContext>(
    useFavoriteMutationOptions(productId, false, 'delete'),
  );
  return useFavoriteMutationState(productId, mutation);
}
