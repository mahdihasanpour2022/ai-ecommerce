import { ApiProperty } from '@nestjs/swagger';

import { ProductImageMediaType } from '../generated/prisma/enums.js';
import { ProductError } from './product.errors.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const MAX_DATABASE_INTEGER = 2_147_483_647;

export interface PublicProductListQuery {
  readonly page: number;
  readonly pageSize: number;
  readonly categoryId?: string;
}

export class PublicCategoryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ minLength: 1, maxLength: 120 })
  name!: string;

  @ApiProperty({ type: () => PublicCategoryDto, isArray: true })
  children!: PublicCategoryDto[];
}

export class PublicProductCategoryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ minLength: 1, maxLength: 120 })
  name!: string;
}

export class PublicProductImageDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    example: '/api/v1/catalog/product-images/00000000-0000-4000-8000-000000000000/content',
  })
  url!: string;

  @ApiProperty({ minimum: 1, maximum: 8192 })
  width!: number;

  @ApiProperty({ minimum: 1, maximum: 8192 })
  height!: number;

  @ApiProperty({ enum: ProductImageMediaType })
  mediaType!: ProductImageMediaType;
}

export class PublicProductSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ minLength: 1, maxLength: 200 })
  name!: string;

  @ApiProperty({ type: () => PublicProductCategoryDto })
  category!: PublicProductCategoryDto;

  @ApiProperty({ type: () => PublicProductImageDto })
  mainImage!: PublicProductImageDto;

  @ApiProperty({ minimum: 10, maximum: Number.MAX_SAFE_INTEGER, multipleOf: 10 })
  minimumPriceRial!: number;

  @ApiProperty({ minimum: 10, maximum: Number.MAX_SAFE_INTEGER, multipleOf: 10 })
  maximumPriceRial!: number;

  @ApiProperty()
  isAvailable!: boolean;
}

export class PublicProductVariantDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ minLength: 1, maxLength: 80, nullable: true })
  size!: string | null;

  @ApiProperty({ minLength: 1, maxLength: 80, nullable: true })
  color!: string | null;

  @ApiProperty({ minimum: 10, maximum: Number.MAX_SAFE_INTEGER, multipleOf: 10 })
  priceRial!: number;

  @ApiProperty()
  isAvailable!: boolean;
}

export class PublicProductDetailDto extends PublicProductSummaryDto {
  @ApiProperty({ minLength: 1, maxLength: 5000 })
  description!: string;

  @ApiProperty({ type: () => PublicProductCategoryDto, isArray: true, maxItems: 6 })
  categoryPath!: PublicProductCategoryDto[];

  @ApiProperty({ type: () => PublicProductImageDto, isArray: true, minItems: 1, maxItems: 9 })
  images!: PublicProductImageDto[];

  @ApiProperty({ type: () => PublicProductVariantDto, isArray: true, minItems: 1 })
  variants!: PublicProductVariantDto[];
}

export class PublicProductListResponseDto {
  @ApiProperty({ type: () => PublicProductSummaryDto, isArray: true })
  items!: PublicProductSummaryDto[];

  @ApiProperty({ minimum: 1 })
  page!: number;

  @ApiProperty({ minimum: 1, maximum: 60, default: 24 })
  pageSize!: number;

  @ApiProperty({ minimum: 0 })
  totalItems!: number;

  @ApiProperty({ minimum: 0 })
  totalPages!: number;
}

export function parsePublicProductListQuery(query: unknown): PublicProductListQuery {
  if (query === null || Array.isArray(query) || typeof query !== 'object') fail();
  const record = query as Record<string, unknown>;
  if (!Object.keys(record).every((key) => ['page', 'pageSize', 'categoryId'].includes(key))) {
    fail();
  }
  const page = positiveInteger(record.page, 1);
  const pageSize = positiveInteger(record.pageSize, 24, 60);
  if ((page - 1) * pageSize > MAX_DATABASE_INTEGER) fail(['page']);
  return {
    page,
    pageSize,
    ...('categoryId' in record
      ? { categoryId: publicCatalogUuid(record.categoryId, 'categoryId') }
      : {}),
  };
}

export function publicCatalogUuid(value: unknown, field: string): string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) fail([field]);
  return value;
}

function positiveInteger(value: unknown, fallback: number, maximum?: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^[1-9][0-9]*$/u.test(value)) fail();
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || (maximum !== undefined && parsed > maximum)) fail();
  return parsed;
}

function fail(details: readonly string[] = []): never {
  throw new ProductError('VALIDATION_FAILED', details);
}
