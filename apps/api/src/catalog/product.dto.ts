import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ProductImageMediaType, ProductStatus } from '../generated/prisma/enums.js';
import { ProductError } from './product.errors.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const SKU_PATTERN = /^[A-Z0-9][A-Z0-9_-]{0,63}$/u;
const PRODUCT_STATUSES = new Set<string>(Object.values(ProductStatus));
const MAX_DATABASE_INTEGER = 2_147_483_647;

export interface ProductListQuery {
  readonly page: number;
  readonly pageSize: number;
  readonly categoryId?: string;
  readonly status?: ProductStatus;
}

export interface VariantInput {
  readonly sku: string;
  readonly size: string | null;
  readonly sizeKey: string | null;
  readonly color: string | null;
  readonly colorKey: string | null;
  readonly priceRial: bigint;
  readonly isActive: boolean;
  readonly onHandQuantity: number;
}

export interface VariantUpdateInput {
  readonly sku?: string;
  readonly size?: string | null;
  readonly sizeKey?: string | null;
  readonly color?: string | null;
  readonly colorKey?: string | null;
  readonly priceRial?: bigint;
  readonly isActive?: boolean;
}

export interface CreateProductInput {
  readonly name: string;
  readonly description: string | null;
  readonly categoryId: string;
  readonly variants: readonly VariantInput[];
}

export interface UpdateProductInput {
  readonly name?: string;
  readonly description?: string | null;
  readonly categoryId?: string;
  readonly status?: ProductStatus;
}

export class InitialVariantRequestDto {
  @ApiProperty({
    minLength: 1,
    maxLength: 64,
    pattern: SKU_PATTERN.source,
    example: 'TSHIRT-BLK-M',
  })
  sku!: string;

  @ApiPropertyOptional({ minLength: 1, maxLength: 80, nullable: true, default: null })
  size?: string | null;

  @ApiPropertyOptional({ minLength: 1, maxLength: 80, nullable: true, default: null })
  color?: string | null;

  @ApiProperty({ minimum: 10, maximum: Number.MAX_SAFE_INTEGER, multipleOf: 10 })
  priceRial!: number;

  @ApiPropertyOptional({ default: true })
  isActive?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: MAX_DATABASE_INTEGER, default: 0 })
  onHandQuantity?: number;
}

export class CreateVariantRequestDto extends InitialVariantRequestDto {}

export class UpdateVariantRequestDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 64, pattern: SKU_PATTERN.source })
  sku?: string;

  @ApiPropertyOptional({ minLength: 1, maxLength: 80, nullable: true })
  size?: string | null;

  @ApiPropertyOptional({ minLength: 1, maxLength: 80, nullable: true })
  color?: string | null;

  @ApiPropertyOptional({ minimum: 10, maximum: Number.MAX_SAFE_INTEGER, multipleOf: 10 })
  priceRial?: number;

  @ApiPropertyOptional()
  isActive?: boolean;
}

export class CreateProductRequestDto {
  @ApiProperty({ minLength: 1, maxLength: 200, example: 'پیراهن نخی' })
  name!: string;

  @ApiPropertyOptional({ minLength: 1, maxLength: 5000, nullable: true, default: null })
  description?: string | null;

  @ApiProperty({ format: 'uuid' })
  categoryId!: string;

  @ApiProperty({ type: () => InitialVariantRequestDto, isArray: true, minItems: 1 })
  variants!: InitialVariantRequestDto[];
}

export class UpdateProductRequestDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 200 })
  name?: string;

  @ApiPropertyOptional({ minLength: 1, maxLength: 5000, nullable: true })
  description?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  categoryId?: string;

  @ApiPropertyOptional({ enum: ProductStatus })
  status?: ProductStatus;
}

export class ProductCategoryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ minLength: 1, maxLength: 120 })
  name!: string;
}

export class InventoryResponseDto {
  @ApiProperty({ minimum: 0, maximum: MAX_DATABASE_INTEGER })
  onHandQuantity!: number;

  @ApiProperty({ minimum: 1, maximum: MAX_DATABASE_INTEGER })
  version!: number;
}

export class ProductVariantResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  productId!: string;

  @ApiProperty({ minLength: 1, maxLength: 64, pattern: SKU_PATTERN.source })
  sku!: string;

  @ApiProperty({ minLength: 1, maxLength: 80, nullable: true })
  size!: string | null;

  @ApiProperty({ minLength: 1, maxLength: 80, nullable: true })
  color!: string | null;

  @ApiProperty({ minimum: 10, maximum: Number.MAX_SAFE_INTEGER, multipleOf: 10 })
  priceRial!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: () => InventoryResponseDto })
  inventory!: InventoryResponseDto;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class ProductImageMetadataDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ProductImageMediaType })
  mediaType!: ProductImageMediaType;

  @ApiProperty({ minimum: 1, maximum: 409_599 })
  byteSize!: number;

  @ApiProperty({ minimum: 1, maximum: 8192 })
  width!: number;

  @ApiProperty({ minimum: 1, maximum: 8192 })
  height!: number;

  @ApiProperty({ minimum: 0, maximum: 8 })
  position!: number;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class ProductSummaryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ minLength: 1, maxLength: 200 })
  name!: string;

  @ApiProperty({ type: () => ProductCategoryDto })
  category!: ProductCategoryDto;

  @ApiProperty({ enum: ProductStatus })
  status!: ProductStatus;

  @ApiProperty({ minimum: 1 })
  variantCount!: number;

  @ApiProperty({ minimum: 0 })
  activeVariantCount!: number;

  @ApiProperty({ type: () => ProductImageMetadataDto, nullable: true })
  mainImage!: ProductImageMetadataDto | null;

  @ApiProperty({ minimum: 10, maximum: Number.MAX_SAFE_INTEGER, multipleOf: 10 })
  minimumPriceRial!: number;

  @ApiProperty({ minimum: 10, maximum: Number.MAX_SAFE_INTEGER, multipleOf: 10 })
  maximumPriceRial!: number;

  @ApiProperty({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER })
  totalOnHandQuantity!: number;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class ProductDetailDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ minLength: 1, maxLength: 200 })
  name!: string;

  @ApiProperty({ minLength: 1, maxLength: 5000, nullable: true })
  description!: string | null;

  @ApiProperty({ type: () => ProductCategoryDto })
  category!: ProductCategoryDto;

  @ApiProperty({ enum: ProductStatus })
  status!: ProductStatus;

  @ApiProperty({ minimum: 1, maximum: MAX_DATABASE_INTEGER })
  imageVersion!: number;

  @ApiProperty({ type: () => ProductVariantResponseDto, isArray: true })
  variants!: ProductVariantResponseDto[];

  @ApiProperty({ type: () => ProductImageMetadataDto, isArray: true })
  images!: ProductImageMetadataDto[];

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class ProductListResponseDto {
  @ApiProperty({ type: () => ProductSummaryDto, isArray: true })
  items!: ProductSummaryDto[];

  @ApiProperty({ minimum: 1 })
  page!: number;

  @ApiProperty({ minimum: 1, maximum: 100 })
  pageSize!: number;

  @ApiProperty({ minimum: 0 })
  totalItems!: number;

  @ApiProperty({ minimum: 0 })
  totalPages!: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && !Array.isArray(value) && typeof value === 'object';
}

function hasOnlyKeys(record: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(record).every((key) => allowed.includes(key));
}

function fail(details: readonly string[] = []): never {
  throw new ProductError('VALIDATION_FAILED', details);
}

export function parseCatalogUuid(value: unknown, field: string): string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) fail([field]);
  return value;
}

function containsDisallowedControl(value: string, allowMultiline: boolean): boolean {
  return Array.from(value).some((character) => {
    const point = character.codePointAt(0);
    if (point === undefined) return true;
    if (allowMultiline && (point === 9 || point === 10)) return false;
    return point < 32 || (point >= 127 && point <= 159);
  });
}

function normalizeSingleLine(value: unknown, field: string, maximum: number): string {
  if (typeof value !== 'string') fail([field]);
  const normalized = value.normalize('NFKC').trim().replace(/\s+/gu, ' ');
  const length = Array.from(normalized).length;
  if (length < 1 || length > maximum || containsDisallowedControl(normalized, false)) fail([field]);
  return normalized;
}

function comparisonKey(value: string, field: string, maximum: number): string {
  const key = value.toUpperCase().toLowerCase();
  if (Array.from(key).length > maximum) fail([field]);
  return key;
}

function normalizeDescription(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== 'string') fail(['description']);
  const description = value.normalize('NFKC').replace(/\r\n?/gu, '\n').trim();
  const length = Array.from(description).length;
  if (
    length < 1 ||
    length > 5000 ||
    containsDisallowedControl(description, true) ||
    /[<>]/u.test(description)
  ) {
    fail(['description']);
  }
  return description;
}

function parseSku(value: unknown): string {
  if (typeof value !== 'string') fail(['sku']);
  const sku = value.normalize('NFKC').trim().toUpperCase();
  if (!SKU_PATTERN.test(sku)) fail(['sku']);
  return sku;
}

function parsePrice(value: unknown): bigint {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0 || value % 10 !== 0) {
    fail(['priceRial']);
  }
  return BigInt(value);
}

function parseQuantity(value: unknown): number {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > MAX_DATABASE_INTEGER
  ) {
    fail(['onHandQuantity']);
  }
  return value;
}

function parseBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') fail([field]);
  return value;
}

function parseNullableOption(
  value: unknown,
  field: 'color' | 'size',
): { value: string | null; key: string | null } {
  if (value === null) return { value: null, key: null };
  const normalized = normalizeSingleLine(value, field, 80);
  return { value: normalized, key: comparisonKey(normalized, field, 160) };
}

function parseVariant(record: Record<string, unknown>): VariantInput {
  if (
    !hasOnlyKeys(record, ['sku', 'size', 'color', 'priceRial', 'isActive', 'onHandQuantity']) ||
    !('sku' in record) ||
    !('priceRial' in record)
  ) {
    fail();
  }
  const size = parseNullableOption('size' in record ? record.size : null, 'size');
  const color = parseNullableOption('color' in record ? record.color : null, 'color');
  return {
    sku: parseSku(record.sku),
    size: size.value,
    sizeKey: size.key,
    color: color.value,
    colorKey: color.key,
    priceRial: parsePrice(record.priceRial),
    isActive: 'isActive' in record ? parseBoolean(record.isActive, 'isActive') : true,
    onHandQuantity: 'onHandQuantity' in record ? parseQuantity(record.onHandQuantity) : 0,
  };
}

export function parseCreateProductRequest(body: unknown): CreateProductInput {
  if (
    !isRecord(body) ||
    !hasOnlyKeys(body, ['name', 'description', 'categoryId', 'variants']) ||
    !('name' in body) ||
    !('categoryId' in body) ||
    !Array.isArray(body.variants) ||
    body.variants.length === 0
  ) {
    fail();
  }
  const variants = body.variants.map((variant) => {
    if (!isRecord(variant)) fail(['variants']);
    return parseVariant(variant);
  });
  return {
    name: normalizeSingleLine(body.name, 'name', 200),
    description: 'description' in body ? normalizeDescription(body.description) : null,
    categoryId: parseCatalogUuid(body.categoryId, 'categoryId'),
    variants,
  };
}

export function parseCreateVariantRequest(body: unknown): VariantInput {
  if (!isRecord(body)) fail();
  return parseVariant(body);
}

export function parseUpdateProductRequest(body: unknown): UpdateProductInput {
  if (
    !isRecord(body) ||
    !hasOnlyKeys(body, ['name', 'description', 'categoryId', 'status']) ||
    Object.keys(body).length === 0
  ) {
    fail();
  }
  let status: ProductStatus | undefined;
  if ('status' in body) {
    if (typeof body.status !== 'string' || !PRODUCT_STATUSES.has(body.status)) fail(['status']);
    status = body.status as ProductStatus;
  }
  return {
    ...('name' in body ? { name: normalizeSingleLine(body.name, 'name', 200) } : {}),
    ...('description' in body ? { description: normalizeDescription(body.description) } : {}),
    ...('categoryId' in body
      ? { categoryId: parseCatalogUuid(body.categoryId, 'categoryId') }
      : {}),
    ...(status === undefined ? {} : { status }),
  };
}

export function parseUpdateVariantRequest(body: unknown): VariantUpdateInput {
  if (
    !isRecord(body) ||
    !hasOnlyKeys(body, ['sku', 'size', 'color', 'priceRial', 'isActive']) ||
    Object.keys(body).length === 0
  ) {
    fail();
  }
  const size = 'size' in body ? parseNullableOption(body.size, 'size') : undefined;
  const color = 'color' in body ? parseNullableOption(body.color, 'color') : undefined;
  return {
    ...('sku' in body ? { sku: parseSku(body.sku) } : {}),
    ...(size === undefined ? {} : { size: size.value, sizeKey: size.key }),
    ...(color === undefined ? {} : { color: color.value, colorKey: color.key }),
    ...('priceRial' in body ? { priceRial: parsePrice(body.priceRial) } : {}),
    ...('isActive' in body ? { isActive: parseBoolean(body.isActive, 'isActive') } : {}),
  };
}

function parsePositiveQueryInteger(value: unknown, fallback: number, maximum?: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^[1-9][0-9]*$/u.test(value)) fail();
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || (maximum !== undefined && parsed > maximum)) fail();
  return parsed;
}

export function parseProductListQuery(query: unknown): ProductListQuery {
  if (!isRecord(query) || !hasOnlyKeys(query, ['page', 'pageSize', 'categoryId', 'status'])) {
    fail();
  }
  let status: ProductStatus | undefined;
  if ('status' in query) {
    if (typeof query.status !== 'string' || !PRODUCT_STATUSES.has(query.status)) fail(['status']);
    status = query.status as ProductStatus;
  }
  const page = parsePositiveQueryInteger(query.page, 1);
  const pageSize = parsePositiveQueryInteger(query.pageSize, 25, 100);
  if ((page - 1) * pageSize > MAX_DATABASE_INTEGER) fail(['page']);
  return {
    page,
    pageSize,
    ...('categoryId' in query
      ? { categoryId: parseCatalogUuid(query.categoryId, 'categoryId') }
      : {}),
    ...(status === undefined ? {} : { status }),
  };
}
