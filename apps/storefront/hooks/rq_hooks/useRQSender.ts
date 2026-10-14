'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryKey, UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import type { AxiosRequestConfig } from 'axios';
import { AdminHttpError, httpClient } from '../../app/http/http-client';
import { safeRequestPath } from '../../utils/request-path';

type MutationMethod = 'delete' | 'patch' | 'post' | 'put';
type MutationQueryParams = Readonly<
  Record<string, boolean | number | string | null | undefined>
>;
type SafeMutationConfig = Omit<
  AxiosRequestConfig,
  | 'authPolicy'
  | 'baseURL'
  | 'data'
  | 'headers'
  | 'method'
  | 'params'
  | 'url'
  | 'withCredentials'
>;

type VariableResolver<Value, Variables> = Value | ((variables: Variables) => Value);

export interface RQMutationRequest<Variables> {
  readonly method: MutationMethod;
  readonly url: VariableResolver<string, Variables>;
  readonly body?: (variables: Variables) => unknown;
  readonly params?: (variables: Variables) => MutationQueryParams;
  readonly axiosConfig?: VariableResolver<SafeMutationConfig, Variables>;
}

type RQSenderBaseOptions<Data, Variables, OnMutateResult> = Omit<
  UseMutationOptions<Data, AdminHttpError, Variables, OnMutateResult>,
  'mutationFn' | 'onSuccess'
> & {
  readonly invalidateQueryKeys?: readonly QueryKey[];
  readonly onSuccess?: UseMutationOptions<
    Data,
    AdminHttpError,
    Variables,
    OnMutateResult
  >['onSuccess'];
};

export type RQSenderOptions<Data, Variables, OnMutateResult = unknown> =
  RQSenderBaseOptions<Data, Variables, OnMutateResult> &
    (
      | {
          readonly request: RQMutationRequest<Variables>;
          readonly mutationFn?: never;
        }
      | {
          readonly request?: never;
          readonly mutationFn: (variables: Variables) => Promise<Data>;
        }
    );

function resolveVariable<Value, Variables>(
  resolver: VariableResolver<Value, Variables>,
  variables: Variables,
): Value {
  return typeof resolver === 'function'
    ? (resolver as (currentVariables: Variables) => Value)(variables)
    : resolver;
}

async function sendMutation<Data, Variables>(
  request: RQMutationRequest<Variables>,
  variables: Variables,
): Promise<Data> {
  const axiosConfig = request.axiosConfig
    ? resolveVariable(request.axiosConfig, variables)
    : {};
  const response = await httpClient.request<Data>({
    ...axiosConfig,
    method: request.method,
    url: safeRequestPath(resolveVariable(request.url, variables)),
    ...(request.body ? { data: request.body(variables) } : {}),
    ...(request.params ? { params: request.params(variables) } : {}),
    authPolicy: { csrf: 'required', failure: 'caller', refresh: 'eligible' },
  });
  return response.data;
}

export function useRQSender<Data, Variables, OnMutateResult = unknown>(
  options: RQSenderOptions<Data, Variables, OnMutateResult>,
): UseMutationResult<Data, AdminHttpError, Variables, OnMutateResult> {
  const queryClient = useQueryClient();
  const executionOptions = options as RQSenderBaseOptions<Data, Variables, OnMutateResult> & {
    readonly request?: RQMutationRequest<Variables>;
    readonly mutationFn?: (variables: Variables) => Promise<Data>;
  };
  const {
    invalidateQueryKeys = [],
    mutationFn: customMutationFn,
    onSuccess,
    request,
    ...mutationOptions
  } = executionOptions;
  const mutationFn = request
    ? (variables: Variables) => sendMutation<Data, Variables>(request, variables)
    : customMutationFn;
  if (!mutationFn) {
    throw new AdminHttpError('configuration', null, 'MISSING_MUTATION_EXECUTOR');
  }
  return useMutation({
    ...mutationOptions,
    mutationFn,
    retry: false,
    async onSuccess(data, variables, onMutateResult, context) {
      await onSuccess?.(data, variables, onMutateResult, context);
      await Promise.all(
        invalidateQueryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
    },
  });
}
