import { ApiProperty } from '@nestjs/swagger';
import { ProductStatus } from '../generated/prisma/enums.js';

export const PRODUCT_SIZE_OPTIONS = [
  'small',
  'medium',
  'large',
  'x-large',
  '2x-large',
  '3x-large',
] as const;

export type ProductSizeOption = (typeof PRODUCT_SIZE_OPTIONS)[number];

export const PRODUCT_COLOR_OPTIONS = [
  { 'color-name': 'blue', 'hex-code': '#2563EB' },
  { 'color-name': 'red', 'hex-code': '#DC2626' },
  { 'color-name': 'green', 'hex-code': '#16A34A' },
  { 'color-name': 'white', 'hex-code': '#FFFFFF' },
  { 'color-name': 'black', 'hex-code': '#111827' },
] as const;

export type ProductColorName = (typeof PRODUCT_COLOR_OPTIONS)[number]['color-name'];
export type ProductColorHexCode = (typeof PRODUCT_COLOR_OPTIONS)[number]['hex-code'];

const PRODUCT_COLOR_PERSIAN_NAMES = {
  blue: 'آبی',
  red: 'قرمز',
  green: 'سبز',
  white: 'سفید',
  black: 'مشکی',
} as const satisfies Readonly<Record<ProductColorName, string>>;

const PRODUCT_SIZE_PERSIAN_NAMES = {
  small: 'کوچک',
  medium: 'متوسط',
  large: 'بزرگ',
  'x-large': 'خیلی بزرگ',
  '2x-large': 'دو ایکس بزرگ',
  '3x-large': 'سه ایکس بزرگ',
} as const satisfies Readonly<Record<ProductSizeOption, string>>;

export const PUBLIC_PRODUCT_COLOR_OPTIONS = PRODUCT_COLOR_OPTIONS.map((option) => ({
  'persian-color-name': PRODUCT_COLOR_PERSIAN_NAMES[option['color-name']],
  'english-color-name': option['color-name'],
  'hex-code': option['hex-code'],
}));

export const PUBLIC_PRODUCT_SIZE_OPTIONS = PRODUCT_SIZE_OPTIONS.map((size) => ({
  'persian-size-name': PRODUCT_SIZE_PERSIAN_NAMES[size],
  'english-size-name': size,
}));

export type PublicProductColorOption = (typeof PUBLIC_PRODUCT_COLOR_OPTIONS)[number];
export type PublicProductSizeOption = (typeof PUBLIC_PRODUCT_SIZE_OPTIONS)[number];

export class ProductColorOptionDto {
  @ApiProperty({ enum: PRODUCT_COLOR_OPTIONS.map((option) => option['color-name']) })
  'color-name'!: ProductColorName;

  @ApiProperty({ pattern: '^#[0-9A-F]{6}$', example: '#2563EB' })
  'hex-code'!: ProductColorHexCode;
}

export class PublicProductColorOptionDto {
  @ApiProperty({ enum: Object.values(PRODUCT_COLOR_PERSIAN_NAMES) })
  'persian-color-name'!: PublicProductColorOption['persian-color-name'];

  @ApiProperty({ enum: PRODUCT_COLOR_OPTIONS.map((option) => option['color-name']) })
  'english-color-name'!: ProductColorName;

  @ApiProperty({ pattern: '^#[0-9A-F]{6}$', example: '#2563EB' })
  'hex-code'!: ProductColorHexCode;
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
