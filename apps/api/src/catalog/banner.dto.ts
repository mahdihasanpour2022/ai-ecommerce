import { ApiProperty } from '@nestjs/swagger';

import { ProductImageMediaType } from '../generated/prisma/enums.js';
import type { ProductImageUploadFile } from './product-image.dto.js';
import { BannerError } from './banner.errors.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

export interface CreateBannerInput {
  readonly file: ProductImageUploadFile;
  readonly alt: string | null;
}

export interface UpdateBannerInput {
  readonly file?: ProductImageUploadFile;
  readonly alt?: string | null;
}

export class CreateBannerRequestDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file!: unknown;

  @ApiProperty({ required: false, nullable: true, minLength: 1, maxLength: 160 })
  alt?: string | null;
}

export class UpdateBannerRequestDto {
  @ApiProperty({ type: 'string', format: 'binary', required: false })
  file?: unknown;

  @ApiProperty({ required: false, nullable: true, minLength: 1, maxLength: 160 })
  alt?: string | null;
}

export class BannerResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: '/api/v1/catalog/banners/00000000-0000-4000-8000-000000000000/content' })
  src!: string;

  @ApiProperty({ nullable: true, minLength: 1, maxLength: 160 })
  alt!: string | null;

  @ApiProperty({ enum: ProductImageMediaType })
  mediaType!: ProductImageMediaType;

  @ApiProperty({ minimum: 1, maximum: 1_048_575 })
  byteSize!: number;

  @ApiProperty({ minimum: 1, maximum: 8192 })
  width!: number;

  @ApiProperty({ minimum: 1, maximum: 8192 })
  height!: number;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

// شناسه بنر را پیش از ورود به لایه سرویس محدود می‌کند.
export function parseBannerId(value: unknown): string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new BannerError('VALIDATION_FAILED', ['bannerId']);
  }
  return value;
}

// فقط یک فایل با نام قراردادی file را می‌پذیرد.
export function parseCreateBannerRequest(
  files: readonly ProductImageUploadFile[] | undefined,
  body: unknown,
): CreateBannerInput {
  const record = bannerBody(body);
  const file = bannerFile(files, true);
  if (file === undefined) throw new BannerError('BANNER_IMAGE_REQUIRED', ['file']);
  return { file, alt: bannerAlt(record.alt) };
}

export function parseUpdateBannerRequest(
  files: readonly ProductImageUploadFile[] | undefined,
  body: unknown,
): UpdateBannerInput {
  const record = bannerBody(body);
  const file = bannerFile(files, false);
  if (file === undefined && !('alt' in record)) throw new BannerError('VALIDATION_FAILED');
  return {
    ...(file === undefined ? {} : { file }),
    ...('alt' in record ? { alt: bannerAlt(record.alt) } : {}),
  };
}

function bannerBody(body: unknown): Record<string, unknown> {
  if (body === null || Array.isArray(body) || typeof body !== 'object') {
    throw new BannerError('VALIDATION_FAILED');
  }
  const record = body as Record<string, unknown>;
  if (!Object.keys(record).every((key) => key === 'alt')) {
    throw new BannerError('VALIDATION_FAILED');
  }
  return record;
}

function bannerFile(
  files: readonly ProductImageUploadFile[] | undefined,
  required: boolean,
): ProductImageUploadFile | undefined {
  if (files === undefined || files.length === 0) {
    if (required) throw new BannerError('BANNER_IMAGE_REQUIRED', ['file']);
    return undefined;
  }
  if (files.length !== 1 || files[0]?.fieldname !== 'file') {
    throw new BannerError('VALIDATION_FAILED', ['file']);
  }
  return files[0];
}

function bannerAlt(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new BannerError('VALIDATION_FAILED', ['alt']);
  const normalized = value.trim();
  if (normalized.length === 0) return null;
  if (normalized.length > 160) throw new BannerError('VALIDATION_FAILED', ['alt']);
  return normalized;
}
