import { ApiProperty } from '@nestjs/swagger';

import type { ProductImageMediaType } from '../generated/prisma/enums.js';
import { ProductImageMetadataDto } from './product.dto.js';
import { ProductImageError } from './product-image.errors.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const MAX_DATABASE_INTEGER = 2_147_483_647;

export interface ProductImageUploadFile {
  readonly fieldname: string;
  readonly mimetype: string;
  readonly size: number;
  readonly buffer: Buffer;
}

export interface ProductImageUploadInput {
  readonly imageVersion: number;
  readonly file: ProductImageUploadFile;
}

export interface ProductImageOrderInput {
  readonly imageVersion: number;
  readonly imageIds: readonly string[];
}

export interface ValidatedProductImage {
  readonly bytes: Buffer;
  readonly mediaType: ProductImageMediaType;
  readonly extension: 'jpg' | 'png' | 'webp';
  readonly byteSize: number;
  readonly width: number;
  readonly height: number;
}

export class ProductImageMultipartRequestDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file!: unknown;

  @ApiProperty({ type: 'integer', minimum: 1, maximum: MAX_DATABASE_INTEGER })
  imageVersion!: number;
}

export class ProductImageOrderRequestDto {
  @ApiProperty({ type: 'string', format: 'uuid', isArray: true })
  imageIds!: string[];

  @ApiProperty({ type: 'integer', minimum: 1, maximum: MAX_DATABASE_INTEGER })
  imageVersion!: number;
}

export class ProductImageCollectionResponseDto {
  @ApiProperty({ type: 'integer', minimum: 1, maximum: MAX_DATABASE_INTEGER })
  imageVersion!: number;

  @ApiProperty({ type: () => ProductImageMetadataDto, isArray: true })
  images!: ProductImageMetadataDto[];
}

export interface ProductImageContent {
  readonly id: string;
  readonly storageKey: string;
  readonly mediaType: ProductImageMediaType;
  readonly byteSize: number;
}

export function parseProductImageUpload(
  files: readonly ProductImageUploadFile[] | undefined,
  body: unknown,
): ProductImageUploadInput {
  if (
    files === undefined ||
    files.length !== 1 ||
    files[0]?.fieldname !== 'file' ||
    body === null ||
    Array.isArray(body) ||
    typeof body !== 'object'
  ) {
    fail();
  }
  const record = body as Record<string, unknown>;
  if (Object.keys(record).length !== 1 || !('imageVersion' in record)) fail();
  return { file: files[0], imageVersion: parseCanonicalInteger(record.imageVersion) };
}

export function parseProductImageOrder(body: unknown): ProductImageOrderInput {
  if (body === null || Array.isArray(body) || typeof body !== 'object') fail();
  const record = body as Record<string, unknown>;
  if (
    Object.keys(record).length !== 2 ||
    !Array.isArray(record.imageIds) ||
    !('imageVersion' in record)
  ) {
    fail();
  }
  const imageIds = record.imageIds.map((id) => {
    if (typeof id !== 'string' || !UUID_PATTERN.test(id)) fail();
    return id;
  });
  return { imageIds, imageVersion: parseJsonInteger(record.imageVersion) };
}

export function parseProductImageVersionQuery(query: unknown): number {
  if (query === null || Array.isArray(query) || typeof query !== 'object') fail();
  const record = query as Record<string, unknown>;
  if (Object.keys(record).length !== 1 || !('imageVersion' in record)) fail();
  return parseCanonicalInteger(record.imageVersion);
}

function parseCanonicalInteger(value: unknown): number {
  if (typeof value !== 'string' || !/^[1-9]\d*$/u.test(value)) fail();
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed > MAX_DATABASE_INTEGER) fail();
  return parsed;
}

function parseJsonInteger(value: unknown): number {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > MAX_DATABASE_INTEGER
  ) {
    fail();
  }
  return value;
}

function fail(): never {
  throw new ProductImageError('VALIDATION_FAILED');
}
