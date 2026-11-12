'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import type { InfiniteData, QueryKey } from '@tanstack/react-query';
import type { AxiosRequestConfig } from 'axios';
import { useCallback, useRef } from 'react';
import { httpClient } from '../../app/http/http-client';
import type { StorefrontHttpError } from '../../app/http/http-client';

type SafeGetConfig = Omit<
  AxiosRequestConfig,
  | 'allowAbsoluteUrls'
  | 'baseURL'
  | 'headers'
  | 'method'
  | 'paramsSerializer'
  | 'signal'
  | 'url'
  | 'withCredentials'
>;

interface RQInfiniteFetcherOptions<Data> {
  readonly queryKey: QueryKey;
  readonly url: string;
  readonly pageSize: number;
  readonly enabled?: boolean;
  readonly staleTime?: number;
  readonly gcTime?: number;
  readonly axiosConfig?: SafeGetConfig;
  readonly getNextPageParam: (
    lastPage: Data,
    allPages: Data[],
    lastPageParam: number,
    allPageParams: number[],
  ) => number | null | undefined;
}

export function useRQInfiniteFetcher<Data>({
  queryKey,
  url,
  pageSize,
  enabled,
  staleTime,
  gcTime,
  axiosConfig,
  getNextPageParam,
}: RQInfiniteFetcherOptions<Data>) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const query = useInfiniteQuery<
    Data,
    StorefrontHttpError,
    InfiniteData<Data, number>,
    QueryKey,
    number
  >({
    queryKey,
    queryFn: async ({ pageParam, signal }) => {
      const response = await httpClient.get<Data>(url, {
        ...axiosConfig,
        params: {
          ...axiosConfig?.params,
          page: pageParam,
          pageSize,
        },
        paramsSerializer: { indexes: null },
        signal,
      });
      return response.data;
    },
    initialPageParam: 1,
    getNextPageParam,
    ...(enabled === undefined ? {} : { enabled }),
    ...(staleTime === undefined ? {} : { staleTime }),
    ...(gcTime === undefined ? {} : { gcTime }),
  });

  const { fetchNextPage, hasNextPage, isFetchingNextPage } = query;
  const loadMoreRef = useCallback(
    (node: HTMLDivElement | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      if (node === null || !hasNextPage || isFetchingNextPage) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
            void fetchNextPage();
          }
        },
        { rootMargin: '0px 0px 48px 0px', threshold: 0.1 },
      );
      observer.observe(node);
      observerRef.current = observer;
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  return { ...query, loadMoreRef };
}
