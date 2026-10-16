'use client';

import { useQuery } from '@tanstack/react-query';
import type { QueryKey, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { AxiosRequestConfig } from 'axios';
import { httpClient } from '../../app/http/http-client';
import type { StorefrontHttpError } from '../../app/http/http-client';

type SafeGetConfig = Omit<
  AxiosRequestConfig,
  | 'allowAbsoluteUrls'
  | 'baseURL'
  | 'headers'
  | 'method'
  | 'signal'
  | 'url'
  | 'withCredentials'
>;

export type RQFetcherOptions<Data> = Omit<
  UseQueryOptions<Data, StorefrontHttpError, Data, QueryKey>,
  'queryFn'
> & {
  readonly url: string;
  readonly axiosConfig?: SafeGetConfig;
};

export function useRQFetcher<Data>({
  url,
  axiosConfig,
  ...queryOptions
}: RQFetcherOptions<Data>): UseQueryResult<Data, StorefrontHttpError> {
  return useQuery({
    ...queryOptions,
    queryFn: async ({ signal }) => {
      const response = await httpClient.get<Data>(url, {
        ...axiosConfig,
        signal,
      });
      return response.data;
    },
  });
}
