import { ApiProperty } from '@nestjs/swagger';

import { ProductImageMediaType } from '../generated/prisma/enums.js';
import type { ProductImageUploadFile } from './product-image.dto.js';
import { BannerError } from './banner.errors.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

export interface BannerImageInput {
  readonly file: ProductImageUploadFile;
}

export class BannerImageRequestDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file!: unknown;
}

export class BannerResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

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
export function parseBannerImage(
  files: readonly ProductImageUploadFile[] | undefined,
  body: unknown,
): BannerImageInput {
  if (body === null || Array.isArray(body) || typeof body !== 'object' || Object.keys(body).length !== 0) {
    throw new BannerError('VALIDATION_FAILED');
  }
  if (files === undefined || files.length === 0) {
    throw new BannerError('BANNER_IMAGE_REQUIRED', ['file']);
  }
  if (files.length !== 1 || files[0]?.fieldname !== 'file') {
    throw new BannerError('VALIDATION_FAILED', ['file']);
  }
  return { file: files[0] };
}
