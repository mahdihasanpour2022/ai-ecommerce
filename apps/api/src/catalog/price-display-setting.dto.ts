import { ApiProperty } from '@nestjs/swagger';

import { PriceDisplayUnit } from '../generated/prisma/enums.js';
import { PriceDisplaySettingError } from './price-display-setting.errors.js';

const PRICE_DISPLAY_UNITS = new Set<string>(Object.values(PriceDisplayUnit));

export interface UpdatePriceDisplaySettingInput {
  readonly unit: PriceDisplayUnit;
}

export class UpdatePriceDisplaySettingRequestDto {
  @ApiProperty({ enum: PriceDisplayUnit })
  unit!: PriceDisplayUnit;
}

export class PriceDisplaySettingResponseDto {
  @ApiProperty({ enum: PriceDisplayUnit })
  unit!: PriceDisplayUnit;
}

export function parseUpdatePriceDisplaySettingRequest(
  body: unknown,
): UpdatePriceDisplaySettingInput {
  if (body === null || Array.isArray(body) || typeof body !== 'object') fail();
  const record = body as Record<string, unknown>;
  if (
    Object.keys(record).length !== 1 ||
    !('unit' in record) ||
    typeof record.unit !== 'string' ||
    !PRICE_DISPLAY_UNITS.has(record.unit)
  ) {
    fail();
  }
  return { unit: record.unit as PriceDisplayUnit };
}

function fail(): never {
  throw new PriceDisplaySettingError('VALIDATION_FAILED');
}
