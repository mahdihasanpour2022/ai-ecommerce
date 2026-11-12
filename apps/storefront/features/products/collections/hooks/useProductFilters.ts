'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

type ProductFilterName = 'color' | 'size';

function normalizedFilter(value: string | null): string | undefined {
  const normalized = value?.normalize('NFKC').trim();
  return normalized ? normalized : undefined;
}

function normalizedPrice(value: string | null): number | undefined {
  if (value === null || !/^(?:0|[1-9][0-9]*)$/u.test(value)) return undefined;
  const price = Number(value);
  return Number.isSafeInteger(price) ? price : undefined;
}

export function useProductFilters() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedColor = normalizedFilter(searchParams.get('color'));
  const selectedSize = normalizedFilter(searchParams.get('size'));
  const minimumPriceRial = normalizedPrice(searchParams.get('minimumPriceRial'));
  const maximumPriceRial = normalizedPrice(searchParams.get('maximumPriceRial'));

  const updateFilter = useCallback(
    (name: ProductFilterName, value?: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(name, value);
      else params.delete(name);
      const query = params.toString();
      window.history.pushState(null, '', query ? `${pathname}?${query}` : pathname);
    },
    [pathname, searchParams],
  );

  const clearAll = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('color');
    params.delete('size');
    params.delete('minimumPriceRial');
    params.delete('maximumPriceRial');
    const query = params.toString();
    window.history.pushState(null, '', query ? `${pathname}?${query}` : pathname);
  }, [pathname, searchParams]);

  const setColor = useCallback((color: string) => updateFilter('color', color), [updateFilter]);
  const setSize = useCallback((size: string) => updateFilter('size', size), [updateFilter]);
  const clearColor = useCallback(() => updateFilter('color'), [updateFilter]);
  const clearSize = useCallback(() => updateFilter('size'), [updateFilter]);
  const setPriceRange = useCallback(
    (minimum: number, maximum: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('minimumPriceRial', String(minimum));
      params.set('maximumPriceRial', String(maximum));
      const query = params.toString();
      window.history.replaceState(null, '', query ? `${pathname}?${query}` : pathname);
    },
    [pathname, searchParams],
  );
  const clearPriceRange = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('minimumPriceRial');
    params.delete('maximumPriceRial');
    const query = params.toString();
    window.history.pushState(null, '', query ? `${pathname}?${query}` : pathname);
  }, [pathname, searchParams]);

  return {
    selectedColor,
    selectedSize,
    minimumPriceRial,
    maximumPriceRial,
    setColor,
    setSize,
    clearColor,
    clearSize,
    setPriceRange,
    clearPriceRange,
    clearAll,
  } as const;
}
