import { ApiProperty } from '@nestjs/swagger';
import { ProductStatus } from '../generated/prisma/enums.js';
import { ProductOptionError } from './product-option.errors.js';

export const PRODUCT_SIZE_OPTIONS = [
  'small',
  'medium',
  'large',
  'x-large',
  '2x-large',
  '3x-large',
] as const;

export type ProductSizeOption = (typeof PRODUCT_SIZE_OPTIONS)[number];

const PRODUCT_SIZE_PERSIAN_NAMES = {
  small: 'کوچک',
  medium: 'متوسط',
  large: 'بزرگ',
  'x-large': 'خیلی بزرگ',
  '2x-large': 'دو ایکس بزرگ',
  '3x-large': 'سه ایکس بزرگ',
} as const satisfies Readonly<Record<ProductSizeOption, string>>;

export const PUBLIC_PRODUCT_SIZE_OPTIONS = PRODUCT_SIZE_OPTIONS.map((size) => ({
  'persian-size-name': PRODUCT_SIZE_PERSIAN_NAMES[size],
  'english-size-name': size,
}));

export interface PublicProductColorOption {
  readonly 'persian-color-name': string;
  readonly 'english-color-name': string;
  readonly 'hex-code': string;
}
export type PublicProductSizeOption = (typeof PUBLIC_PRODUCT_SIZE_OPTIONS)[number];

export class PublicProductColorOptionDto {
  @ApiProperty({ minLength: 1, maxLength: 80, example: 'آبی' })
  'persian-color-name'!: string;

  @ApiProperty({ minLength: 1, maxLength: 80, pattern: '^[a-z][a-z0-9-]{0,79}$', example: 'blue' })
  'english-color-name'!: string;

  @ApiProperty({ pattern: '^#[0-9A-F]{6}$', example: '#2563EB' })
  'hex-code'!: string;
}

export function parseProductColorName(value: string): string {
  const normalized = value.normalize('NFKC').trim().toLowerCase();
  if (!/^[a-z][a-z0-9-]{0,79}$/u.test(normalized)) {
    throw new ProductOptionError('PRODUCT_COLOR_NOT_FOUND');
  }
  return normalized;
}

export class PublicProductSizeOptionDto {
  @ApiProperty({ enum: Object.values(PRODUCT_SIZE_PERSIAN_NAMES) })
  'persian-size-name'!: PublicProductSizeOption['persian-size-name'];

  @ApiProperty({ enum: PRODUCT_SIZE_OPTIONS })
  'english-size-name'!: ProductSizeOption;
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
