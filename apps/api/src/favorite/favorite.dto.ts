import { ApiProperty } from '@nestjs/swagger';

import { PublicProductSummaryDto } from '../catalog/public-catalog.dto.js';
import { FavoriteError } from './favorite.errors.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const MAX_DATABASE_INTEGER = 2_147_483_647;

export interface FavoriteListQuery {
  readonly page: number;
  readonly pageSize: number;
}

export class FavoritePageDto {
  @ApiProperty({ type: () => PublicProductSummaryDto, isArray: true })
  items!: PublicProductSummaryDto[];

  @ApiProperty({ minimum: 1 })
  page!: number;

  @ApiProperty({ minimum: 1, maximum: 60, default: 24 })
  pageSize!: number;

  @ApiProperty({ minimum: 0 })
  totalItems!: number;

  @ApiProperty({ minimum: 0 })
  totalPages!: number;
}

export class FavoriteMutationDto {
  @ApiProperty({ format: 'uuid' })
  productId!: string;

  @ApiProperty()
  isFavorite!: boolean;
}

// query صفحه‌بندی را به دو عدد محدود و بدون کلید ناشناخته تبدیل می‌کند.
export function parseFavoriteListQuery(query: unknown): FavoriteListQuery {
  if (query === null || Array.isArray(query) || typeof query !== 'object') fail();
  const record = query as Record<string, unknown>;
  if (!Object.keys(record).every((key) => key === 'page' || key === 'pageSize')) fail();
  const page = positiveInteger(record.page, 1);
  const pageSize = positiveInteger(record.pageSize, 24, 60);
  if ((page - 1) * pageSize > MAX_DATABASE_INTEGER) fail(['page']);
  return { page, pageSize };
}

// شناسه مسیر را پیش از رسیدن به Prisma به UUID معتبر محدود می‌کند.
export function favoriteProductId(value: unknown): string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) fail();
  return value;
}

function positiveInteger(value: unknown, fallback: number, maximum?: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^[1-9][0-9]*$/u.test(value)) fail();
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || (maximum !== undefined && parsed > maximum)) fail();
  return parsed;
}

function fail(details: readonly string[] = []): never {
  throw new FavoriteError('VALIDATION_FAILED', details);
}
