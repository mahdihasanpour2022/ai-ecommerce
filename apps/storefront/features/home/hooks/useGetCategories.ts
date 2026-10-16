'use client';

import { ApiResponse } from '@/app/http/api-response';
import { useRQFetcher } from '@/hooks/rq_hooks/useRQFetcher';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { ApiRoutes } from '../constants/apiRoues';

interface Category {
  readonly id: string;
  readonly name: string;
  readonly src: string;
  readonly children: Category[];
}

type Categories = ApiResponse<readonly Category[], null, null>;

export const useGetCategories = () => {
  const response = useRQFetcher<Categories>({
    queryKey: ['all-categories'],
    staleTime: 0,
    gcTime: 0,
    url: ApiRoutes.categories,
  });

  const { error, isError } = response;

  useEffect(() => {
    if (error && isError) {
      toast.error(error.message, { duration: 2_000 });
    }
  }, [error, isError]);

  return response;
};
