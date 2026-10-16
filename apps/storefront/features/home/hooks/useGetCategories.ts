'use client';

import { useRQFetcher } from '@/hooks/rq_hooks/useRQFetcher';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { ApiRoutes } from '../constants/apiRoues';
import { ApiResponse } from '@/app/http/api-response';


 interface Category {
  readonly id: string;
  readonly src: string;
  readonly alt: string | null;
  readonly mediaType: 'JPEG' | 'PNG' | 'WEBP';
  readonly byteSize: number;
  readonly width: number;
  readonly height: number;
  readonly createdAt: string;
  readonly updatedAt: string;
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
