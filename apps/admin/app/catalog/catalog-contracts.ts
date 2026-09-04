import { AdminHttpError } from '../http/http-client';

export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type ProductImageMediaType = 'WEBP' | 'JPEG' | 'PNG';
export type PriceDisplayUnit = 'RIAL' | 'TOMAN';

export interface CategoryDto {
  readonly id: string;
  readonly name: string;
  readonly parentId: string | null;
  readonly level: number;
  readonly children: readonly CategoryDto[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProductCategoryDto {
  readonly id: string;
  readonly name: string;
}

export interface InventoryDto {
  readonly onHandQuantity: number;
  readonly version: number;
}

export interface ProductVariantDto {
  readonly id: string;
  readonly productId: string;
  readonly sku: string;
  readonly size: string | null;
  readonly color: string | null;
  readonly priceRial: number;
  readonly isActive: boolean;
  readonly inventory: InventoryDto;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProductImageDto {
  readonly id: string;
  readonly mediaType: ProductImageMediaType;
  readonly byteSize: number;
  readonly width: number;
  readonly height: number;
  readonly position: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProductSummaryDto {
  readonly id: string;
  readonly name: string;
  readonly category: ProductCategoryDto;
  readonly status: ProductStatus;
  readonly variantCount: number;
  readonly activeVariantCount: number;
  readonly mainImage: ProductImageDto | null;
  readonly minimumPriceRial: number;
  readonly maximumPriceRial: number;
  readonly totalOnHandQuantity: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProductDetailDto {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly category: ProductCategoryDto;
  readonly status: ProductStatus;
  readonly imageVersion: number;
  readonly variants: readonly ProductVariantDto[];
  readonly images: readonly ProductImageDto[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProductListDto {
  readonly items: readonly ProductSummaryDto[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
}

export interface PriceDisplaySettingDto {
  readonly unit: PriceDisplayUnit;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const PRODUCT_STATUSES = new Set<ProductStatus>(['DRAFT', 'ACTIVE', 'ARCHIVED']);
const IMAGE_TYPES = new Set<ProductImageMediaType>(['WEBP', 'JPEG', 'PNG']);
const PRICE_UNITS = new Set<PriceDisplayUnit>(['RIAL', 'TOMAN']);
const MAX_DATABASE_INTEGER = 2_147_483_647;

function invalidResponse(): never {
  throw new AdminHttpError('http', 502, 'INVALID_RESPONSE');
}

function record(value: unknown): Record<string, unknown> {
  if (value === null || Array.isArray(value) || typeof value !== 'object') invalidResponse();
  return value as Record<string, unknown>;
}

function stringValue(value: unknown, nullable = false): string | null {
  if (nullable && value === null) return null;
  if (typeof value !== 'string' || value.length === 0) invalidResponse();
  return value;
}

function uuid(value: unknown): string {
  const parsed = stringValue(value);
  if (parsed === null || !UUID_PATTERN.test(parsed)) invalidResponse();
  return parsed;
}

function dateTime(value: unknown): string {
  const parsed = stringValue(value);
  if (parsed === null || Number.isNaN(Date.parse(parsed))) invalidResponse();
  return parsed;
}

function integer(value: unknown, minimum: number, maximum = Number.MAX_SAFE_INTEGER): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    invalidResponse();
  }
  return value as number;
}

function price(value: unknown): number {
  const parsed = integer(value, 10);
  if (parsed % 10 !== 0) invalidResponse();
  return parsed;
}

function category(value: unknown): CategoryDto {
  const item = record(value);
  if (!Array.isArray(item.children)) invalidResponse();
  const parentId = item.parentId === null ? null : uuid(item.parentId);
  return {
    id: uuid(item.id),
    name: stringValue(item.name) as string,
    parentId,
    level: integer(item.level, 1, 6),
    children: item.children.map(category),
    createdAt: dateTime(item.createdAt),
    updatedAt: dateTime(item.updatedAt),
  };
}

function productCategory(value: unknown): ProductCategoryDto {
  const item = record(value);
  return { id: uuid(item.id), name: stringValue(item.name) as string };
}

function inventory(value: unknown): InventoryDto {
  const item = record(value);
  return {
    onHandQuantity: integer(item.onHandQuantity, 0, MAX_DATABASE_INTEGER),
    version: integer(item.version, 1, MAX_DATABASE_INTEGER),
  };
}

function image(value: unknown): ProductImageDto {
  const item = record(value);
  if (
    typeof item.mediaType !== 'string' ||
    !IMAGE_TYPES.has(item.mediaType as ProductImageMediaType)
  ) {
    invalidResponse();
  }
  return {
    id: uuid(item.id),
    mediaType: item.mediaType as ProductImageMediaType,
    byteSize: integer(item.byteSize, 1, 409_599),
    width: integer(item.width, 1, 8192),
    height: integer(item.height, 1, 8192),
    position: integer(item.position, 0, 8),
    createdAt: dateTime(item.createdAt),
    updatedAt: dateTime(item.updatedAt),
  };
}

function status(value: unknown): ProductStatus {
  if (typeof value !== 'string' || !PRODUCT_STATUSES.has(value as ProductStatus)) invalidResponse();
  return value as ProductStatus;
}

function variant(value: unknown): ProductVariantDto {
  const item = record(value);
  if (typeof item.isActive !== 'boolean') invalidResponse();
  return {
    id: uuid(item.id),
    productId: uuid(item.productId),
    sku: stringValue(item.sku) as string,
    size: stringValue(item.size, true),
    color: stringValue(item.color, true),
    priceRial: price(item.priceRial),
    isActive: item.isActive,
    inventory: inventory(item.inventory),
    createdAt: dateTime(item.createdAt),
    updatedAt: dateTime(item.updatedAt),
  };
}

function summary(value: unknown): ProductSummaryDto {
  const item = record(value);
  return {
    id: uuid(item.id),
    name: stringValue(item.name) as string,
    category: productCategory(item.category),
    status: status(item.status),
    variantCount: integer(item.variantCount, 1),
    activeVariantCount: integer(item.activeVariantCount, 0),
    mainImage: item.mainImage === null ? null : image(item.mainImage),
    minimumPriceRial: price(item.minimumPriceRial),
    maximumPriceRial: price(item.maximumPriceRial),
    totalOnHandQuantity: integer(item.totalOnHandQuantity, 0),
    createdAt: dateTime(item.createdAt),
    updatedAt: dateTime(item.updatedAt),
  };
}

export function parseCategoryTree(value: unknown): readonly CategoryDto[] {
  if (!Array.isArray(value)) invalidResponse();
  return value.map(category);
}

export function parseProductList(value: unknown): ProductListDto {
  const body = record(value);
  if (!Array.isArray(body.items)) invalidResponse();
  return {
    items: body.items.map(summary),
    page: integer(body.page, 1),
    pageSize: integer(body.pageSize, 1, 100),
    totalItems: integer(body.totalItems, 0),
    totalPages: integer(body.totalPages, 0),
  };
}

export function parseProductDetail(value: unknown): ProductDetailDto {
  const body = record(value);
  if (!Array.isArray(body.variants) || !Array.isArray(body.images)) invalidResponse();
  return {
    id: uuid(body.id),
    name: stringValue(body.name) as string,
    description: stringValue(body.description, true),
    category: productCategory(body.category),
    status: status(body.status),
    imageVersion: integer(body.imageVersion, 1, MAX_DATABASE_INTEGER),
    variants: body.variants.map(variant),
    images: body.images.map(image),
    createdAt: dateTime(body.createdAt),
    updatedAt: dateTime(body.updatedAt),
  };
}

export function parsePriceDisplaySetting(value: unknown): PriceDisplaySettingDto {
  const body = record(value);
  if (typeof body.unit !== 'string' || !PRICE_UNITS.has(body.unit as PriceDisplayUnit)) {
    invalidResponse();
  }
  return { unit: body.unit as PriceDisplayUnit };
}

export function isCatalogUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
