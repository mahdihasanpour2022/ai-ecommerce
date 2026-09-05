'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryKey, UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import type { AdminHttpError } from '../../app/http/http-client';

export type RQSenderOptions<Data, Variables, OnMutateResult = unknown> = Omit<
  UseMutationOptions<Data, AdminHttpError, Variables, OnMutateResult>,
  'mutationFn' | 'onSuccess'
> & {
  readonly mutationFn: (variables: Variables) => Promise<Data>;
  readonly invalidateQueryKeys?: readonly QueryKey[];
  readonly onSuccess?: UseMutationOptions<
    Data,
    AdminHttpError,
    Variables,
    OnMutateResult
  >['onSuccess'];
};

export function useRQSender<Data, Variables, OnMutateResult = unknown>(
  options: RQSenderOptions<Data, Variables, OnMutateResult>,
): UseMutationResult<Data, AdminHttpError, Variables, OnMutateResult> {
  const queryClient = useQueryClient();
  const { invalidateQueryKeys = [], onSuccess, ...mutationOptions } = options;
  return useMutation({
    ...mutationOptions,
    retry: false,
    async onSuccess(data, variables, onMutateResult, context) {
      await onSuccess?.(data, variables, onMutateResult, context);
      await Promise.all(
        invalidateQueryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
    },
  });
}
