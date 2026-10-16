'use client';

import type { UseMutationResult } from '@tanstack/react-query';
import type { StorefrontHttpError } from '../../app/http/http-client';
import { useRQSender } from './useRQSender';
import type { RQSenderOptions } from './useRQSender';

export type RQDeleterOptions<Data, Variables, OnMutateResult = unknown> = RQSenderOptions<
  Data,
  Variables,
  OnMutateResult
>;

export function useRQDeleter<Data, Variables, OnMutateResult = unknown>(
  options: RQDeleterOptions<Data, Variables, OnMutateResult>,
): UseMutationResult<Data, StorefrontHttpError, Variables, OnMutateResult> {
  return useRQSender(options);
}
