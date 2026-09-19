'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export function parsePageParam(value: string | null): number {
  if (value === null || !/^[1-9]\d*$/u.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) ? page : 1;
}

export function useUrlPage() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = parsePageParam(searchParams.get('page'));

  const setPage = useCallback(
    (nextPage: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', String(nextPage));
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return { page, setPage } as const;
}
