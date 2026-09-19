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

export class ProductColorOptionDto {
  @ApiProperty({ enum: PRODUCT_COLOR_OPTIONS.map((option) => option['color-name']) })
  'color-name'!: ProductColorName;

  @ApiProperty({ pattern: '^#[0-9A-F]{6}$', example: '#2563EB' })
  'hex-code'!: ProductColorHexCode;
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
