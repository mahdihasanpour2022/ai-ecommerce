'use client';

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  FetchQueryOptions,
  QueryFunction,
  QueryKey,
  UseQueryOptions,
  UseQueryResult,
} from '@tanstack/react-query';
import type { AdminHttpError } from '../../app/http/http-client';

export type RQFetcherOptions<QueryData, Data = QueryData, Key extends QueryKey = QueryKey> = Omit<
  UseQueryOptions<QueryData, AdminHttpError, Data, Key>,
  'queryKey' | 'queryFn' | 'initialData'
> & {
  readonly queryKey: Key;
  readonly queryFn: QueryFunction<QueryData, Key>;
};

export function useRQFetcher<QueryData, Data = QueryData, Key extends QueryKey = QueryKey>(
  options: RQFetcherOptions<QueryData, Data, Key>,
): UseQueryResult<Data, AdminHttpError> {
  return useQuery<QueryData, AdminHttpError, Data, Key>(options);
}

export type RQFetchQueryOptions<QueryData, Key extends QueryKey = QueryKey> = FetchQueryOptions<
  QueryData,
  AdminHttpError,
  QueryData,
  Key
>;

/** Cache-aware imperative reads for established screens with explicit retry/refetch controls. */
export function useRQFetchQuery() {
  const queryClient = useQueryClient();
  return useCallback(
    <QueryData, Key extends QueryKey>(options: RQFetchQueryOptions<QueryData, Key>) =>
      queryClient.fetchQuery(options),
    [queryClient],
  );
}
