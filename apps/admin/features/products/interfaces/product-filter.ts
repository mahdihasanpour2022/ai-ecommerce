import type { ProductStatus } from './product-contract';

export type ProductAvailability = 'IN_STOCK' | 'OUT_OF_STOCK';

export interface ProductFilters {
  readonly name?: string;
  readonly tags?: readonly string[];
  readonly categoryId?: string;
  readonly size?: string;
  readonly color?: string;
  readonly status?: ProductStatus;
  readonly availability?: ProductAvailability;
  readonly createdFrom?: string;
  readonly createdTo?: string;
  readonly minimumPriceRial?: string;
  readonly maximumPriceRial?: string;
  readonly maximumDiscountPercent?: string;
}

export const PRODUCT_FILTER_PARAMETER_NAMES = [
  'name',
  'tags',
  'categoryId',
  'size',
  'color',
  'status',
  'availability',
  'createdFrom',
  'createdTo',
  'minimumPriceRial',
  'maximumPriceRial',
  'maximumDiscountPercent',
] as const;

export function productFilterCount(filters: ProductFilters): number {
  return PRODUCT_FILTER_PARAMETER_NAMES.filter((name) => filters[name] !== undefined).length;
}
