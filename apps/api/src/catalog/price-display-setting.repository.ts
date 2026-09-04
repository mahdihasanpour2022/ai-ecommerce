import { Injectable } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';
import type { PriceDisplayUnit } from '../generated/prisma/enums.js';

const SINGLETON_ID = 1;

@Injectable()
export class PriceDisplaySettingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async read(): Promise<PriceDisplayUnit> {
    const setting = await this.prisma.priceDisplaySetting.findUnique({
      where: { id: SINGLETON_ID },
      select: { unit: true },
    });
    if (setting === null) throw new Error('Price display setting singleton is unavailable.');
    return setting.unit;
  }

  async update(unit: PriceDisplayUnit): Promise<PriceDisplayUnit> {
    const setting = await this.prisma.priceDisplaySetting.update({
      where: { id: SINGLETON_ID },
      data: { unit },
      select: { unit: true },
    });
    return setting.unit;
  }
}
