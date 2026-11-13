import { ApiProperty } from '@nestjs/swagger';
import { ProductStatus } from '../generated/prisma/enums.js';
import { ProductOptionError } from './product-option.errors.js';

const PERSIAN_COLOR_NAME_PATTERN =
  /^[\u0621-\u063A\u0641-\u064A\u067E\u0686\u0698\u06A9\u06AF\u06CC]+(?:[ \u200C][\u0621-\u063A\u0641-\u064A\u067E\u0686\u0698\u06A9\u06AF\u06CC]+)*$/u;
const ENGLISH_COLOR_NAME_PATTERN = /^[A-Za-z]+$/u;
const ENGLISH_SIZE_NAME_PATTERN = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/u;
const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/u;

export interface PublicProductColorOption {
  readonly 'persian-color-name': string;
  readonly 'english-color-name': string;
  readonly 'hex-code': string;
}
export interface PublicProductSizeOption {
  readonly 'persian-size-name': string;
  readonly 'english-size-name': string;
}

export class PublicProductColorOptionDto {
  @ApiProperty({ minLength: 1, maxLength: 80, example: 'آبی' })
  'persian-color-name'!: string;

  @ApiProperty({ minLength: 1, maxLength: 80, pattern: '^[a-z][a-z0-9-]{0,79}$', example: 'blue' })
  'english-color-name'!: string;

  @ApiProperty({ pattern: '^#[0-9A-F]{6}$', example: '#2563EB' })
  'hex-code'!: string;
}

export class ProductColorRequestDto {
  @ApiProperty({ minLength: 1, maxLength: 80, pattern: PERSIAN_COLOR_NAME_PATTERN.source, example: 'آبی' })
  persianName!: string;

  @ApiProperty({ minLength: 1, maxLength: 80, pattern: ENGLISH_COLOR_NAME_PATTERN.source, example: 'blue' })
  englishName!: string;

  @ApiProperty({ pattern: '^#[0-9A-Fa-f]{6}$', example: '#2563EB' })
  hexCode!: string;
}

export interface ProductColorInput {
  readonly persianName: string;
  readonly englishName: string;
  readonly hexCode: string;
}

export class ProductSizeRequestDto {
  @ApiProperty({ minLength: 1, maxLength: 80, pattern: PERSIAN_COLOR_NAME_PATTERN.source, example: 'بزرگ' })
  persianName!: string;

  @ApiProperty({ minLength: 1, maxLength: 80, pattern: ENGLISH_SIZE_NAME_PATTERN.source, example: 'x-large' })
  englishName!: string;
}

export interface ProductSizeInput {
  readonly persianName: string;
  readonly englishName: string;
}

export function parseProductColorRequest(value: unknown): ProductColorInput {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) validationFailed();
  const record = value as Record<string, unknown>;
  if (
    Object.keys(record).length !== 3 ||
    !['persianName', 'englishName', 'hexCode'].every((key) => key in record)
  ) {
    validationFailed();
  }
  const persianName = normalizedRequiredString(record.persianName, 80);
  const englishName = normalizedRequiredString(record.englishName, 80);
  const hexCode = normalizedRequiredString(record.hexCode, 7);
  if (
    !PERSIAN_COLOR_NAME_PATTERN.test(persianName) ||
    !ENGLISH_COLOR_NAME_PATTERN.test(englishName) ||
    !HEX_COLOR_PATTERN.test(hexCode)
  ) {
    validationFailed();
  }
  return {
    persianName,
    englishName: englishName.toLowerCase(),
    hexCode: hexCode.toUpperCase(),
  };
}

function normalizedRequiredString(
  value: unknown,
  maximumLength: number,
  fail: () => never = validationFailed,
): string {
  if (typeof value !== 'string') fail();
  const normalized = value.normalize('NFKC').trim().replace(/ +/gu, ' ');
  if (normalized.length === 0 || normalized.length > maximumLength) fail();
  return normalized;
}

function validationFailed(): never {
  throw new ProductOptionError('VALIDATION_FAILED');
}

export function parseProductColorName(value: string): string {
  const normalized = value.normalize('NFKC').trim().toLowerCase();
  if (!/^[a-z][a-z0-9-]{0,79}$/u.test(normalized)) {
    throw new ProductOptionError('PRODUCT_COLOR_NOT_FOUND');
  }
  return normalized;
}

export function parseProductSizeRequest(value: unknown): ProductSizeInput {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) sizeValidationFailed();
  const record = value as Record<string, unknown>;
  if (
    Object.keys(record).length !== 2 ||
    !['persianName', 'englishName'].every((key) => key in record)
  ) {
    sizeValidationFailed();
  }
  const persianName = normalizedRequiredString(record.persianName, 80, sizeValidationFailed);
  const englishName = normalizedRequiredString(record.englishName, 80, sizeValidationFailed);
  if (!PERSIAN_COLOR_NAME_PATTERN.test(persianName) || !ENGLISH_SIZE_NAME_PATTERN.test(englishName)) {
    sizeValidationFailed();
  }
  return { persianName, englishName: englishName.toLowerCase() };
}

function sizeValidationFailed(): never {
  throw new ProductOptionError('PRODUCT_SIZE_VALIDATION_FAILED');
}

export function parseProductSizeName(value: string): string {
  const normalized = value.normalize('NFKC').trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(normalized) || normalized.length > 80) {
    throw new ProductOptionError('PRODUCT_SIZE_NOT_FOUND');
  }
  return normalized;
}

export class PublicProductSizeOptionDto {
  @ApiProperty({ minLength: 1, maxLength: 80, example: 'بزرگ' })
  'persian-size-name'!: string;

  @ApiProperty({ minLength: 1, maxLength: 80, example: 'large' })
  'english-size-name'!: string;
}

export const PRODUCT_STATUS_OPTIONS = [
  { status_persian_name: 'پیش‌نویس', status_english_name: ProductStatus.DRAFT },
  { status_persian_name: 'فعال', status_english_name: ProductStatus.ACTIVE },
  { status_persian_name: 'بایگانی‌شده', status_english_name: ProductStatus.ARCHIVED },
] as const;

export type ProductStatusPersianName =
  (typeof PRODUCT_STATUS_OPTIONS)[number]['status_persian_name'];

export class ProductStatusOptionDto {
  @ApiProperty({ enum: PRODUCT_STATUS_OPTIONS.map((option) => option.status_persian_name) })
  status_persian_name!: ProductStatusPersianName;

  @ApiProperty({ enum: ProductStatus })
  status_english_name!: ProductStatus;
}
