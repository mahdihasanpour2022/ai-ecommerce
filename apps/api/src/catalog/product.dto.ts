import { validatePlainText } from '@e-commerce/plain-text-security';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ProductImageMediaType, ProductStatus } from '../generated/prisma/enums.js';
import { ProductError } from './product.errors.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const SKU_PATTERN = /^[A-Z0-9][A-Z0-9_-]{0,63}$/u;
const PRODUCT_TAG_PATTERN = /^[a-z]+(?:_[a-z]+)*$/u;
const PRODUCT_STATUSES = new Set<string>(Object.values(ProductStatus));
const PRODUCT_AVAILABILITIES = new Set(['IN_STOCK', 'OUT_OF_STOCK'] as const);
const MAX_DATABASE_INTEGER = 2_147_483_647;
const MAX_PRODUCT_FILTER_VALUES = 50;
const MAX_PRODUCT_SPECIFICATIONS = 30;
const MAX_MAIN_PRODUCT_SPECIFICATIONS = 3;
const MAX_SPECIFICATION_KEY_LENGTH = 20;
const MAX_SPECIFICATION_VALUE_LENGTH = 100;
const SPECIFICATION_TEXT_PATTERN = /^[\p{Script=Arabic}A-Za-z0-9\u06F0-\u06F9 _-]+$/u;

export type ProductSpecifications = Readonly<Record<string, string>>;

export class ProductSpecificationDto {
  @ApiProperty({
    minLength: 1,
    maxLength: MAX_SPECIFICATION_KEY_LENGTH,
    pattern: SPECIFICATION_TEXT_PATTERN.source,
    example: 'جنس',
  })
  title!: string;

  @ApiProperty({
    minLength: 1,
    maxLength: MAX_SPECIFICATION_VALUE_LENGTH,
    pattern: SPECIFICATION_TEXT_PATTERN.source,
    example: 'کتان',
  })
  description!: string;
}

export type ProductAvailability = 'IN_STOCK' | 'OUT_OF_STOCK';

export interface ProductListQuery {
  readonly page: number;
  readonly pageSize: number;
  readonly name?: string;
  readonly tags?: readonly string[];
  readonly categoryId?: string;
  readonly sizeKey?: string;
  readonly colorKey?: string;
  readonly status?: ProductStatus;
  readonly availability?: ProductAvailability;
  readonly createdFrom?: Date;
  readonly createdToExclusive?: Date;
  readonly minimumPriceRial?: bigint;
  readonly maximumPriceRial?: bigint;
  readonly maximumDiscountPercent?: number;
}

export interface VariantInput {
  readonly sku: string;
  readonly size: string;
  readonly sizeKey: string;
  readonly color: string;
  readonly colorKey: string;
  readonly isActive: boolean;
  readonly onHandQuantity: number;
}

export type InitialVariantInput = Omit<VariantInput, 'sku'>;

export interface VariantUpdateInput {
  readonly sku?: string;
  readonly size?: string;
  readonly sizeKey?: string;
  readonly color?: string;
  readonly colorKey?: string;
  readonly isActive?: boolean;
}

export interface CreateProductInput {
  readonly name: string;
  readonly description: string | null;
  readonly tag: string | null;
  readonly originalPriceRial: bigint;
  readonly discountPercent: number;
  readonly categoryId: string;
  readonly variants: readonly InitialVariantInput[];
  readonly specifications: ProductSpecifications;
  readonly mainSpecs: ProductSpecifications;
}

export interface UpdateProductInput {
  readonly name?: string;
  readonly description?: string | null;
  readonly tag?: string | null;
  readonly originalPriceRial?: bigint;
  readonly discountPercent?: number;
  readonly categoryId?: string;
  readonly status?: ProductStatus;
  readonly specifications?: ProductSpecifications;
  readonly mainSpecs?: ProductSpecifications;
}

class VariantValuesRequestDto {
  @ApiProperty({ minLength: 1, maxLength: 80, example: 'medium' })
  size!: string;

  @ApiProperty({ minLength: 1, maxLength: 80, example: 'yellow' })
  color!: string;

  @ApiPropertyOptional({ default: true })
  isActive?: boolean;
}

export class InitialVariantRequestDto extends VariantValuesRequestDto {
  @ApiProperty({ minimum: 1, maximum: MAX_DATABASE_INTEGER })
  onHandQuantity!: number;
}

export class CreateVariantRequestDto extends VariantValuesRequestDto {
  @ApiProperty({ minimum: 1, maximum: MAX_DATABASE_INTEGER })
  onHandQuantity!: number;
}

export class UpdateVariantRequestDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 64, pattern: SKU_PATTERN.source })
  sku?: string;

  @ApiPropertyOptional({ minLength: 1, maxLength: 80 })
  size?: string;

  @ApiPropertyOptional({ minLength: 1, maxLength: 80 })
  color?: string;

  @ApiPropertyOptional()
  isActive?: boolean;
}

export class CreateProductRequestDto {
  @ApiProperty({ minLength: 1, maxLength: 200, example: 'پیراهن نخی' })
  name!: string;

  @ApiPropertyOptional({ minLength: 1, maxLength: 200, nullable: true, default: null })
  description?: string | null;

  @ApiPropertyOptional({
    minLength: 1,
    maxLength: 80,
    pattern: PRODUCT_TAG_PATTERN.source,
    nullable: true,
    default: null,
    example: 'my_amazing',
  })
  tag?: string | null;

  @ApiProperty({ minimum: 10, maximum: Number.MAX_SAFE_INTEGER, multipleOf: 10 })
  originalPriceRial!: number;

  @ApiProperty({ minimum: 0, maximum: 100, example: 0 })
  discountPercent!: number;

  @ApiProperty({ format: 'uuid' })
  categoryId!: string;

  @ApiProperty({ type: () => InitialVariantRequestDto, isArray: true, minItems: 1, maxItems: 9 })
  variants!: InitialVariantRequestDto[];

  @ApiPropertyOptional({
    type: () => ProductSpecificationDto,
    isArray: true,
    maxItems: MAX_PRODUCT_SPECIFICATIONS,
    default: [],
    example: [
      { title: 'جنس پارچه', description: 'نخ پنبه' },
      { title: 'نوع یقه', description: 'گرد' },
    ],
    description:
      'جایگزین کامل مشخصات در ایجاد؛ کلیدها حداکثر ۲۰ نویسه و تابع الگوی مجاز متن هستند.',
  })
  specifications?: ProductSpecificationDto[];

  @ApiPropertyOptional({
    type: () => ProductSpecificationDto,
    isArray: true,
    maxItems: MAX_MAIN_PRODUCT_SPECIFICATIONS,
    default: [],
    example: [{ title: 'جنس پارچه', description: 'نخ پنبه' }],
    description:
      'حداکثر سه مورد منتخب از specifications با همان مقدار normalized و الگوی مجاز متن.',
  })
  mainSpecs?: ProductSpecificationDto[];
}

export class UpdateProductRequestDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 200 })
  name?: string;

  @ApiPropertyOptional({ minLength: 1, maxLength: 200, nullable: true })
  description?: string | null;

  @ApiPropertyOptional({
    minLength: 1,
    maxLength: 80,
    pattern: PRODUCT_TAG_PATTERN.source,
    nullable: true,
    example: 'my_amazing',
  })
  tag?: string | null;

  @ApiPropertyOptional({ minimum: 10, maximum: Number.MAX_SAFE_INTEGER, multipleOf: 10 })
  originalPriceRial?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  discountPercent?: number;

  @ApiPropertyOptional({ format: 'uuid' })
  categoryId?: string;

  @ApiPropertyOptional({ enum: ProductStatus })
  status?: ProductStatus;

  @ApiPropertyOptional({
    type: () => ProductSpecificationDto,
    isArray: true,
    maxItems: MAX_PRODUCT_SPECIFICATIONS,
    example: [
      { title: 'جنس پارچه', description: 'نخ پنبه' },
      { title: 'نوع یقه', description: 'گرد' },
    ],
    description:
      'در صورت ارسال، جایگزین کامل specifications است؛ اگر کلید اصلی فعلی حذف شود درخواست رد می‌شود مگر mainSpecs نیز ارسال شود.',
  })
  specifications?: ProductSpecificationDto[];

  @ApiPropertyOptional({
    type: () => ProductSpecificationDto,
    isArray: true,
    maxItems: MAX_MAIN_PRODUCT_SPECIFICATIONS,
    example: [{ title: 'جنس پارچه', description: 'نخ پنبه' }],
    description: 'در صورت ارسال، جایگزین کامل mainSpecs و محدود به کلیدهای specifications است.',
  })
  mainSpecs?: ProductSpecificationDto[];
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

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: () => InventoryResponseDto })
  inventory!: InventoryResponseDto;

  @ApiProperty({ type: () => ProductImageMetadataDto, nullable: true })
  image!: ProductImageMetadataDto | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class ProductImageMetadataDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  variantId!: string | null;

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

  @ApiProperty({ minLength: 1, maxLength: 200, nullable: true })
  description!: string | null;

  @ApiProperty({ minLength: 1, maxLength: 80, pattern: PRODUCT_TAG_PATTERN.source, nullable: true })
  tag!: string | null;

  @ApiProperty({ type: () => ProductCategoryDto })
  category!: ProductCategoryDto;

  @ApiProperty({ enum: ProductStatus })
  status!: ProductStatus;

  @ApiProperty({ minimum: 1 })
  variantCount!: number;

  @ApiProperty({ minimum: 0 })
  activeVariantCount!: number;

  @ApiProperty({ type: String, isArray: true, example: ['M', 'L'] })
  sizes!: string[];

  @ApiProperty({ type: String, isArray: true, example: ['مشکی', 'سفید'] })
  colors!: string[];

  @ApiProperty({ type: () => ProductImageMetadataDto, nullable: true })
  mainImage!: ProductImageMetadataDto | null;

  @ApiProperty({ minimum: 10, maximum: Number.MAX_SAFE_INTEGER, multipleOf: 10 })
  originalPriceRial!: number;

  @ApiProperty({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER })
  finalPriceRial!: number;

  @ApiProperty({ minimum: 0, maximum: 100 })
  discountPercent!: number;

  @ApiProperty({ enum: ['IRR'], example: 'IRR' })
  currency!: 'IRR';

  @ApiProperty({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER })
  totalOnHandQuantity!: number;

  @ApiProperty({
    type: () => ProductSpecificationDto,
    isArray: true,
    maxItems: MAX_MAIN_PRODUCT_SPECIFICATIONS,
    example: [{ title: 'جنس پارچه', description: 'نخ پنبه' }],
  })
  mainSpecs!: ProductSpecificationDto[];

  @ApiProperty({ minimum: 0, maximum: MAX_PRODUCT_SPECIFICATIONS })
  specificationCount!: number;

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

  @ApiProperty({ minLength: 1, maxLength: 200, nullable: true })
  description!: string | null;

  @ApiProperty({ minLength: 1, maxLength: 80, pattern: PRODUCT_TAG_PATTERN.source, nullable: true })
  tag!: string | null;

  @ApiProperty({ minimum: 10, maximum: Number.MAX_SAFE_INTEGER, multipleOf: 10 })
  originalPriceRial!: number;

  @ApiProperty({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER })
  finalPriceRial!: number;

  @ApiProperty({ minimum: 0, maximum: 100 })
  discountPercent!: number;

  @ApiProperty({ enum: ['IRR'], example: 'IRR' })
  currency!: 'IRR';

  @ApiProperty({ type: () => ProductCategoryDto })
  category!: ProductCategoryDto;

  @ApiProperty({ enum: ProductStatus })
  status!: ProductStatus;

  @ApiProperty({ minimum: 1, maximum: MAX_DATABASE_INTEGER })
  imageVersion!: number;

  @ApiProperty({
    type: () => ProductSpecificationDto,
    isArray: true,
    maxItems: MAX_PRODUCT_SPECIFICATIONS,
    example: [
      { title: 'جنس پارچه', description: 'نخ پنبه' },
      { title: 'نوع یقه', description: 'گرد' },
    ],
  })
  specifications!: ProductSpecificationDto[];

  @ApiProperty({
    type: () => ProductSpecificationDto,
    isArray: true,
    maxItems: MAX_MAIN_PRODUCT_SPECIFICATIONS,
    example: [{ title: 'جنس پارچه', description: 'نخ پنبه' }],
  })
  mainSpecs!: ProductSpecificationDto[];

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

// متن کلید و مقدار مشخصات را با مرز امنیتی مشترک و سقف دامنه normalize می‌کند.
function normalizeSpecificationText(value: unknown, field: string, maximum: number): string {
  if (typeof value !== 'string') fail([field]);
  const result = validatePlainText(value);
  if (
    !result.valid ||
    Array.from(result.value).length < 1 ||
    Array.from(result.value).length > maximum ||
    !SPECIFICATION_TEXT_PATTERN.test(result.value)
  ) {
    fail([field]);
  }
  return result.value;
}

// آرایهٔ آیتم‌های قرارداد را با رد فیلدهای ناشناخته به object داخلی normalized تبدیل می‌کند.
function parseSpecificationItems(
  value: unknown,
  field: 'mainSpecs' | 'specifications',
  maximumEntries: number,
): ProductSpecifications {
  if (!Array.isArray(value) || value.length > maximumEntries) fail([field]);
  const comparisonKeys = new Set<string>();
  const normalized: Record<string, string> = {};
  for (const item of value) {
    if (!isRecord(item) || Object.keys(item).length !== 2) fail([field]);
    const key = normalizeSpecificationText(item.title, field, MAX_SPECIFICATION_KEY_LENGTH);
    const comparison = key.toUpperCase().toLowerCase();
    if (comparisonKeys.has(comparison)) fail([field]);
    comparisonKeys.add(comparison);
    normalized[key] = normalizeSpecificationText(
      item.description,
      field,
      MAX_SPECIFICATION_VALUE_LENGTH,
    );
  }
  return normalized;
}

export function productSpecificationsToDto(
  specifications: ProductSpecifications,
): ProductSpecificationDto[] {
  return Object.entries(specifications).map(([title, description]) => ({ title, description }));
}

// کلید و مقدار مشخصات اصلی را به نسخه canonical موجود در specifications متصل می‌کند.
export function resolveMainSpecifications(
  specifications: ProductSpecifications,
  mainSpecs: ProductSpecifications,
): ProductSpecifications {
  const available = new Map(
    Object.entries(specifications).map(([key, value]) => [
      key.toUpperCase().toLowerCase(),
      { key, value },
    ]),
  );
  const resolved: Record<string, string> = {};
  for (const [requestedKey, requestedValue] of Object.entries(mainSpecs)) {
    const specification = available.get(requestedKey.toUpperCase().toLowerCase());
    if (specification === undefined || specification.value !== requestedValue) fail(['mainSpecs']);
    resolved[specification.key] = specification.value;
  }
  return resolved;
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

export function normalizeSingleLine(value: unknown, field: string, maximum: number): string {
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
    length > 200 ||
    containsDisallowedControl(description, true) ||
    /[<>]/u.test(description)
  ) {
    fail(['description']);
  }
  return description;
}

function normalizeProductTag(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== 'string') fail(['tag']);
  const tag = value.normalize('NFKC').trim().toLowerCase();
  if (!PRODUCT_TAG_PATTERN.test(tag) || tag.length > 80) fail(['tag']);
  return tag;
}

function parseSku(value: unknown): string {
  if (typeof value !== 'string') fail(['sku']);
  const sku = value.normalize('NFKC').trim().toUpperCase();
  if (!SKU_PATTERN.test(sku)) fail(['sku']);
  return sku;
}

function parsePrice(value: unknown, field = 'originalPriceRial'): bigint {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0 || value % 10 !== 0) {
    fail([field]);
  }
  return BigInt(value);
}

function parseDiscountPercent(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 100) {
    fail(['discountPercent']);
  }
  return value;
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

function parseRequiredOption(
  value: unknown,
  field: 'color' | 'size',
): { value: string; key: string } {
  if (value === null || value === undefined) fail([field]);
  const normalized = normalizeSingleLine(value, field, 80);
  return { value: normalized, key: comparisonKey(normalized, field, 160) };
}

function parseVariantValues(record: Record<string, unknown>): InitialVariantInput {
  if (!('size' in record) || !('color' in record)) fail(['size', 'color']);
  const size = parseRequiredOption(record.size, 'size');
  const color = parseRequiredOption(record.color, 'color');
  return {
    size: size.value,
    sizeKey: size.key,
    color: color.value,
    colorKey: color.key,
    isActive: 'isActive' in record ? parseBoolean(record.isActive, 'isActive') : true,
    onHandQuantity: 'onHandQuantity' in record ? parseQuantity(record.onHandQuantity) : 0,
  };
}

function parseInitialVariant(record: Record<string, unknown>): InitialVariantInput {
  if (
    !hasOnlyKeys(record, ['size', 'color', 'isActive', 'onHandQuantity']) ||
    !('onHandQuantity' in record)
  ) {
    fail(['onHandQuantity']);
  }
  const parsed = parseVariantValues(record);
  if (parsed.onHandQuantity === 0) fail(['onHandQuantity']);
  return parsed;
}

export function parseCreateProductRequest(body: unknown): CreateProductInput {
  if (
    !isRecord(body) ||
    !hasOnlyKeys(body, [
      'name',
      'description',
      'tag',
      'originalPriceRial',
      'discountPercent',
      'categoryId',
      'variants',
      'specifications',
      'mainSpecs',
    ]) ||
    !('name' in body) ||
    !('originalPriceRial' in body) ||
    !('discountPercent' in body) ||
    !('categoryId' in body) ||
    !Array.isArray(body.variants) ||
    body.variants.length === 0 ||
    body.variants.length > 9
  ) {
    fail();
  }
  const variants = body.variants.map((variant) => {
    if (!isRecord(variant)) fail(['variants']);
    return parseInitialVariant(variant);
  });
  const specifications =
    'specifications' in body
      ? parseSpecificationItems(body.specifications, 'specifications', MAX_PRODUCT_SPECIFICATIONS)
      : {};
  const mainSpecs =
    'mainSpecs' in body
      ? resolveMainSpecifications(
          specifications,
          parseSpecificationItems(body.mainSpecs, 'mainSpecs', MAX_MAIN_PRODUCT_SPECIFICATIONS),
        )
      : {};
  return {
    name: normalizeSingleLine(body.name, 'name', 200),
    description: 'description' in body ? normalizeDescription(body.description) : null,
    tag: 'tag' in body ? normalizeProductTag(body.tag) : null,
    originalPriceRial: parsePrice(body.originalPriceRial),
    discountPercent: parseDiscountPercent(body.discountPercent),
    categoryId: parseCatalogUuid(body.categoryId, 'categoryId'),
    variants,
    specifications,
    mainSpecs,
  };
}

export function parseCreateVariantRequest(body: unknown): InitialVariantInput {
  if (!isRecord(body)) fail();
  return parseInitialVariant(body);
}

export function parseUpdateProductRequest(body: unknown): UpdateProductInput {
  if (
    !isRecord(body) ||
    !hasOnlyKeys(body, [
      'name',
      'description',
      'tag',
      'originalPriceRial',
      'discountPercent',
      'categoryId',
      'status',
      'specifications',
      'mainSpecs',
    ]) ||
    Object.keys(body).length === 0
  ) {
    fail();
  }
  let status: ProductStatus | undefined;
  if ('status' in body) {
    if (typeof body.status !== 'string' || !PRODUCT_STATUSES.has(body.status)) fail(['status']);
    status = body.status as ProductStatus;
  }
  const specifications =
    'specifications' in body
      ? parseSpecificationItems(body.specifications, 'specifications', MAX_PRODUCT_SPECIFICATIONS)
      : undefined;
  const mainSpecs =
    'mainSpecs' in body
      ? parseSpecificationItems(body.mainSpecs, 'mainSpecs', MAX_MAIN_PRODUCT_SPECIFICATIONS)
      : undefined;
  return {
    ...('name' in body ? { name: normalizeSingleLine(body.name, 'name', 200) } : {}),
    ...('description' in body ? { description: normalizeDescription(body.description) } : {}),
    ...('tag' in body ? { tag: normalizeProductTag(body.tag) } : {}),
    ...('originalPriceRial' in body
      ? { originalPriceRial: parsePrice(body.originalPriceRial) }
      : {}),
    ...('discountPercent' in body
      ? { discountPercent: parseDiscountPercent(body.discountPercent) }
      : {}),
    ...('categoryId' in body
      ? { categoryId: parseCatalogUuid(body.categoryId, 'categoryId') }
      : {}),
    ...(status === undefined ? {} : { status }),
    ...(specifications === undefined ? {} : { specifications }),
    ...(mainSpecs === undefined
      ? {}
      : {
          mainSpecs:
            specifications === undefined
              ? mainSpecs
              : resolveMainSpecifications(specifications, mainSpecs),
        }),
  };
}

export function parseUpdateVariantRequest(body: unknown): VariantUpdateInput {
  if (
    !isRecord(body) ||
    !hasOnlyKeys(body, ['sku', 'size', 'color', 'isActive']) ||
    Object.keys(body).length === 0
  ) {
    fail();
  }
  const size = 'size' in body ? parseRequiredOption(body.size, 'size') : undefined;
  const color = 'color' in body ? parseRequiredOption(body.color, 'color') : undefined;
  return {
    ...('sku' in body ? { sku: parseSku(body.sku) } : {}),
    ...(size === undefined ? {} : { size: size.value, sizeKey: size.key }),
    ...(color === undefined ? {} : { color: color.value, colorKey: color.key }),
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

function parseOptionalPriceQuery(value: unknown, field: string): bigint | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !/^[1-9][0-9]*$/u.test(value)) fail([field]);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed % 10 !== 0) fail([field]);
  return BigInt(parsed);
}

function parseOptionalDiscountPercentQuery(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !/^(?:0|[1-9][0-9]{0,2})$/u.test(value)) {
    fail(['maximumDiscountPercent']);
  }
  const parsed = Number(value);
  if (parsed > 100) fail(['maximumDiscountPercent']);
  return parsed;
}

function parseIsoDateTimeQuery(value: unknown, field: string): Date | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value))
    fail([field]);
  const date = new Date(value);
  if (Number.isNaN(date.valueOf()) || date.toISOString() !== value) fail([field]);
  return date;
}

function parseProductTagFilters(value: unknown): readonly string[] {
  const values = Array.isArray(value) ? value : [value];
  if (values.length === 0 || values.length > MAX_PRODUCT_FILTER_VALUES) fail(['tags']);
  const tags = values.map((item) => {
    if (typeof item !== 'string') fail(['tags']);
    const tag = item.normalize('NFKC').trim().toLowerCase();
    if (!PRODUCT_TAG_PATTERN.test(tag) || tag.length > 80) fail(['tags']);
    return tag;
  });
  return [...new Set(tags)];
}

export function parseProductListQuery(query: unknown): ProductListQuery {
  if (
    !isRecord(query) ||
    !hasOnlyKeys(query, [
      'page',
      'pageSize',
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
    ])
  ) {
    fail();
  }
  let status: ProductStatus | undefined;
  if ('status' in query) {
    if (typeof query.status !== 'string' || !PRODUCT_STATUSES.has(query.status)) fail(['status']);
    status = query.status as ProductStatus;
  }
  let availability: ProductAvailability | undefined;
  if ('availability' in query) {
    if (
      typeof query.availability !== 'string' ||
      !PRODUCT_AVAILABILITIES.has(query.availability as ProductAvailability)
    ) {
      fail(['availability']);
    }
    availability = query.availability as ProductAvailability;
  }
  const page = parsePositiveQueryInteger(query.page, 1);
  const pageSize = parsePositiveQueryInteger(query.pageSize, 25, 100);
  const name = 'name' in query ? normalizeSingleLine(query.name, 'name', 200) : undefined;
  const tags = 'tags' in query ? parseProductTagFilters(query.tags) : undefined;
  const size = 'size' in query ? parseNullableOption(query.size, 'size') : undefined;
  const color = 'color' in query ? parseNullableOption(query.color, 'color') : undefined;
  const createdFrom = parseIsoDateTimeQuery(query.createdFrom, 'createdFrom');
  const createdTo = parseIsoDateTimeQuery(query.createdTo, 'createdTo');
  const createdToExclusive =
    createdTo === undefined ? undefined : new Date(createdTo.valueOf() + 1000);
  const minimumPriceRial = parseOptionalPriceQuery(query.minimumPriceRial, 'minimumPriceRial');
  const maximumPriceRial = parseOptionalPriceQuery(query.maximumPriceRial, 'maximumPriceRial');
  const maximumDiscountPercent = parseOptionalDiscountPercentQuery(query.maximumDiscountPercent);
  if ((page - 1) * pageSize > MAX_DATABASE_INTEGER) fail(['page']);
  if (
    createdFrom !== undefined &&
    createdToExclusive !== undefined &&
    createdFrom >= createdToExclusive
  ) {
    fail(['createdFrom', 'createdTo']);
  }
  if (
    minimumPriceRial !== undefined &&
    maximumPriceRial !== undefined &&
    minimumPriceRial > maximumPriceRial
  ) {
    fail(['minimumPriceRial', 'maximumPriceRial']);
  }
  return {
    page,
    pageSize,
    ...(name === undefined ? {} : { name }),
    ...(tags === undefined ? {} : { tags }),
    ...('categoryId' in query
      ? { categoryId: parseCatalogUuid(query.categoryId, 'categoryId') }
      : {}),
    ...(size?.key === undefined || size.key === null ? {} : { sizeKey: size.key }),
    ...(color?.key === undefined || color.key === null ? {} : { colorKey: color.key }),
    ...(status === undefined ? {} : { status }),
    ...(availability === undefined ? {} : { availability }),
    ...(createdFrom === undefined ? {} : { createdFrom }),
    ...(createdToExclusive === undefined ? {} : { createdToExclusive }),
    ...(minimumPriceRial === undefined ? {} : { minimumPriceRial }),
    ...(maximumPriceRial === undefined ? {} : { maximumPriceRial }),
    ...(maximumDiscountPercent === undefined ? {} : { maximumDiscountPercent }),
  };
}
