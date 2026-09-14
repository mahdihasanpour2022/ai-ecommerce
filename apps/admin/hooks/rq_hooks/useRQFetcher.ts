'use client';

import { useQuery } from '@tanstack/react-query';
import type { QueryKey, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { AxiosRequestConfig } from 'axios';
import { httpClient } from '../../app/http/http-client';
import type { AdminHttpError } from '../../app/http/http-client';
import { safeRequestPath } from '../../utils/request-path';

type SafeGetConfig = Omit<
  AxiosRequestConfig,
  'authPolicy' | 'baseURL' | 'headers' | 'method' | 'signal' | 'url' | 'withCredentials'
>;

export type RQFetcherOptions<Data> = Omit<
  UseQueryOptions<Data, AdminHttpError, Data, QueryKey>,
  'queryFn'
> & {
  readonly url: string;
  readonly axiosConfig?: SafeGetConfig;
};

export const safeFetcherPath = safeRequestPath;

export function useRQFetcher<Data>({
  url,
  axiosConfig,
  ...queryOptions
}: RQFetcherOptions<Data>): UseQueryResult<Data, AdminHttpError> {
  return useQuery({
    ...queryOptions,
    queryFn: async ({ signal }) => {
      const response = await httpClient.get<Data>(safeRequestPath(url), {
        ...axiosConfig,
        signal,
        authPolicy: { csrf: 'omit', failure: 'caller', refresh: 'eligible' },
      });
      return response.data;
    },
  });
}
