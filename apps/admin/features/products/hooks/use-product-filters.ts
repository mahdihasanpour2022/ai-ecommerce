'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ProductFilterFormValues } from '../schemas/product-filter-schema';
import {
  PRODUCT_FILTER_PARAMETER_NAMES,
  type ProductAvailability,
  type ProductFilters,
} from '../interfaces/product-filter';
import type { ProductStatus } from '../interfaces/product-contract';

const STATUSES = new Set<ProductStatus>(['DRAFT', 'ACTIVE', 'ARCHIVED']);
const AVAILABILITIES = new Set<ProductAvailability>(['IN_STOCK', 'OUT_OF_STOCK']);
const ISO_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const PRICE_PATTERN = /^[1-9][0-9]*$/u;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

function bounded(value: string | null, maximum: number): string | undefined {
  const normalized = value?.normalize('NFKC').trim();
  return normalized && Array.from(normalized).length <= maximum ? normalized : undefined;
}

function validIsoDateTime(value: string | null): value is string {
  if (!value || !ISO_DATE_TIME_PATTERN.test(value)) return false;
  const date = new Date(value);
  return !Number.isNaN(date.valueOf()) && date.toISOString() === value;
}

function validPrice(value: string | null): value is string {
  if (!value || !PRICE_PATTERN.test(value)) return false;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed % 10 === 0;
}

export function parseProductFilters(searchParams: Pick<URLSearchParams, 'get'>): ProductFilters {
  const name = bounded(searchParams.get('name'), 200);
  const categoryId = bounded(searchParams.get('categoryId'), 36);
  const size = bounded(searchParams.get('size'), 80);
  const color = bounded(searchParams.get('color'), 80);
  const status = searchParams.get('status');
  const availability = searchParams.get('availability');
  const createdFrom = searchParams.get('createdFrom');
  const createdTo = searchParams.get('createdTo');
  const minimumPriceRial = searchParams.get('minimumPriceRial');
  const maximumPriceRial = searchParams.get('maximumPriceRial');
  return {
    ...(name ? { name } : {}),
    ...(categoryId && UUID_PATTERN.test(categoryId) ? { categoryId } : {}),
    ...(size ? { size } : {}),
    ...(color ? { color } : {}),
    ...(status && STATUSES.has(status as ProductStatus) ? { status: status as ProductStatus } : {}),
    ...(availability && AVAILABILITIES.has(availability as ProductAvailability)
      ? { availability: availability as ProductAvailability }
      : {}),
    ...(validIsoDateTime(createdFrom) ? { createdFrom } : {}),
    ...(validIsoDateTime(createdTo) ? { createdTo } : {}),
    ...(validPrice(minimumPriceRial) ? { minimumPriceRial } : {}),
    ...(validPrice(maximumPriceRial) ? { maximumPriceRial } : {}),
  };
}

export function productFilterFormValues(filters: ProductFilters): ProductFilterFormValues {
  return {
    name: filters.name ?? '',
    categoryId: filters.categoryId ?? '',
    size: filters.size ?? '',
    color: filters.color ?? '',
    status: filters.status ?? '',
    availability: filters.availability ?? '',
    createdFrom: filters.createdFrom ?? '',
    createdTo: filters.createdTo ?? '',
    minimumPriceRial: filters.minimumPriceRial ?? '',
    maximumPriceRial: filters.maximumPriceRial ?? '',
  };
}

function compact(values: ProductFilterFormValues): ProductFilters {
  return Object.fromEntries(
    Object.entries(values)
      .map(([key, value]) => [key, value.trim()] as const)
      .filter(([, value]) => value.length > 0),
  ) as ProductFilters;
}

export function useProductFilters() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const serialized = searchParams.toString();
  const filters = useMemo(() => parseProductFilters(new URLSearchParams(serialized)), [serialized]);

  const replaceFilters = useCallback(
    (nextFilters: ProductFilters) => {
      const params = new URLSearchParams(serialized);
      for (const name of PRODUCT_FILTER_PARAMETER_NAMES) params.delete(name);
      params.set('page', '1');
      for (const [name, value] of Object.entries(nextFilters)) {
        if (value) params.set(name, value);
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, serialized],
  );

  return {
    filters,
    applyFilters: (values: ProductFilterFormValues) => replaceFilters(compact(values)),
    clearFilters: () => replaceFilters({}),
  } as const;
}
