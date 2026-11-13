import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { PublicProductColorOption } from './product-option.dto.js';

@Injectable()
export class ProductOptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async colors(): Promise<PublicProductColorOption[]> {
    const rows = await this.prisma.productColorOption.findMany({
      orderBy: [{ createdAt: 'asc' }, { englishName: 'asc' }],
      select: { englishName: true, persianName: true, hexCode: true },
    });
    return rows.map((row) => ({
      'persian-color-name': row.persianName,
      'english-color-name': row.englishName,
      'hex-code': row.hexCode,
    }));
  }

  async deleteColor(englishName: string): Promise<boolean> {
    const result = await this.prisma.productColorOption.deleteMany({ where: { englishName } });
    return result.count === 1;
  }
}
