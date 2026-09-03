import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { CategoryError } from './category.errors.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

export interface NormalizedCategoryName {
  readonly name: string;
  readonly nameKey: string;
}

export interface CreateCategoryInput extends NormalizedCategoryName {
  readonly parentId: string | null;
}

export interface UpdateCategoryInput {
  readonly name?: string;
  readonly nameKey?: string;
  readonly parentId?: string | null;
}

export class CreateCategoryRequestDto {
  @ApiProperty({ minLength: 1, maxLength: 120, example: 'پوشاک زنانه' })
  name!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, default: null })
  parentId?: string | null;
}

export class UpdateCategoryRequestDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 120, example: 'مانتو' })
  name?: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  parentId?: string | null;
}

export class CategoryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ minLength: 1, maxLength: 120 })
  name!: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  parentId!: string | null;

  @ApiProperty({ minimum: 1, maximum: 6 })
  level!: number;

  @ApiProperty({ type: () => CategoryResponseDto, isArray: true })
  children!: CategoryResponseDto[];

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && !Array.isArray(value) && typeof value === 'object';
}

function hasOnlyKeys(record: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(record).every((key) => allowed.includes(key));
}

export function parseCategoryId(value: unknown): string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new CategoryError('VALIDATION_FAILED', ['categoryId']);
  }
  return value;
}

export function normalizeCategoryName(value: unknown): NormalizedCategoryName {
  if (typeof value !== 'string') {
    throw new CategoryError('VALIDATION_FAILED', ['name']);
  }
  const name = value.normalize('NFKC').trim().replace(/\s+/gu, ' ');
  const length = Array.from(name).length;
  const hasControl = Array.from(name).some((character) => {
    const point = character.codePointAt(0);
    return point !== undefined && (point < 32 || (point >= 127 && point <= 159));
  });
  if (length < 1 || length > 120 || hasControl) {
    throw new CategoryError('VALIDATION_FAILED', ['name']);
  }
  const nameKey = name.toUpperCase().toLowerCase();
  if (Array.from(nameKey).length > 256) {
    throw new CategoryError('VALIDATION_FAILED', ['name']);
  }
  return { name, nameKey };
}

function parseParentId(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new CategoryError('VALIDATION_FAILED', ['parentId']);
  }
  return value;
}

export function parseCreateCategoryRequest(body: unknown): CreateCategoryInput {
  if (!isRecord(body) || !hasOnlyKeys(body, ['name', 'parentId']) || !('name' in body)) {
    throw new CategoryError('VALIDATION_FAILED');
  }
  const normalized = normalizeCategoryName(body.name);
  return {
    ...normalized,
    parentId: 'parentId' in body ? parseParentId(body.parentId) : null,
  };
}

export function parseUpdateCategoryRequest(body: unknown): UpdateCategoryInput {
  if (
    !isRecord(body) ||
    !hasOnlyKeys(body, ['name', 'parentId']) ||
    Object.keys(body).length === 0
  ) {
    throw new CategoryError('VALIDATION_FAILED');
  }
  const normalized = 'name' in body ? normalizeCategoryName(body.name) : undefined;
  return {
    ...(normalized ?? {}),
    ...('parentId' in body ? { parentId: parseParentId(body.parentId) } : {}),
  };
}
