import { Injectable } from '@nestjs/common';

import type {
  PriceDisplaySettingResponseDto,
  UpdatePriceDisplaySettingInput,
} from './price-display-setting.dto.js';
import { PriceDisplaySettingRepository } from './price-display-setting.repository.js';

@Injectable()
export class PriceDisplaySettingService {
  constructor(private readonly repository: PriceDisplaySettingRepository) {}

  async read(): Promise<PriceDisplaySettingResponseDto> {
    return { unit: await this.repository.read() };
  }

  async update(input: UpdatePriceDisplaySettingInput): Promise<PriceDisplaySettingResponseDto> {
    return { unit: await this.repository.update(input.unit) };
  }
}
