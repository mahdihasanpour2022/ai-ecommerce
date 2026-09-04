import { ApiProperty } from '@nestjs/swagger';

import { InventoryError } from './inventory.errors.js';

const MAX_DATABASE_INTEGER = 2_147_483_647;

export interface UpdateInventoryInput {
  readonly onHandQuantity: number;
  readonly version: number;
}

export class UpdateInventoryRequestDto {
  @ApiProperty({ type: 'integer', minimum: 0, maximum: MAX_DATABASE_INTEGER })
  onHandQuantity!: number;

  @ApiProperty({ type: 'integer', minimum: 1, maximum: MAX_DATABASE_INTEGER })
  version!: number;
}

export class UpdateInventoryResponseDto {
  @ApiProperty({ type: 'integer', minimum: 0, maximum: MAX_DATABASE_INTEGER })
  onHandQuantity!: number;

  @ApiProperty({ type: 'integer', minimum: 1, maximum: MAX_DATABASE_INTEGER })
  version!: number;
}

export function parseUpdateInventoryRequest(body: unknown): UpdateInventoryInput {
  if (body === null || Array.isArray(body) || typeof body !== 'object') fail();
  const record = body as Record<string, unknown>;
  const keys = Object.keys(record);
  if (
    keys.length !== 2 ||
    !keys.includes('onHandQuantity') ||
    !keys.includes('version') ||
    !isBoundedInteger(record.onHandQuantity, 0) ||
    !isBoundedInteger(record.version, 1)
  ) {
    fail();
  }
  return {
    onHandQuantity: record.onHandQuantity,
    version: record.version,
  };
}

function isBoundedInteger(value: unknown, minimum: number): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= minimum &&
    value <= MAX_DATABASE_INTEGER
  );
}

function fail(): never {
  throw new InventoryError('VALIDATION_FAILED');
}
