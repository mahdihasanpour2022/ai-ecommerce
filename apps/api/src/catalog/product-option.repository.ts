import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type {
  ProductColorInput,
  ProductSizeInput,
  PublicProductColorOption,
  PublicProductSizeOption,
} from './product-option.dto.js';

const colorSelect = { englishName: true, persianName: true, hexCode: true } as const;
const sizeSelect = { englishName: true, persianName: true } as const;

function toColorOption(row: {
  readonly englishName: string;
  readonly persianName: string;
  readonly hexCode: string;
}): PublicProductColorOption {
  return {
    'persian-color-name': row.persianName,
    'english-color-name': row.englishName,
    'hex-code': row.hexCode,
  };
}

function toSizeOption(row: { readonly englishName: string; readonly persianName: string }): PublicProductSizeOption {
  return {
    'persian-size-name': row.persianName,
    'english-size-name': row.englishName,
  };
}

@Injectable()
export class ProductOptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async colors(): Promise<PublicProductColorOption[]> {
    const rows = await this.prisma.productColorOption.findMany({
      orderBy: [{ createdAt: 'asc' }, { englishName: 'asc' }],
      select: colorSelect,
    });
    return rows.map(toColorOption);
  }

  async sizes(): Promise<PublicProductSizeOption[]> {
    const rows = await this.prisma.productSizeOption.findMany({
      orderBy: [{ createdAt: 'asc' }, { englishName: 'asc' }],
      select: sizeSelect,
    });
    return rows.map(toSizeOption);
  }

  async createSize(input: ProductSizeInput): Promise<PublicProductSizeOption> {
    return toSizeOption(
      await this.prisma.productSizeOption.create({ data: input, select: sizeSelect }),
    );
  }

  async updateSize(
    currentEnglishName: string,
    input: ProductSizeInput,
  ): Promise<PublicProductSizeOption> {
    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.productSizeOption.update({
        where: { englishName: currentEnglishName },
        data: input,
        select: sizeSelect,
      });
      if (currentEnglishName !== input.englishName) {
        await transaction.productVariant.updateMany({
          where: { sizeKey: currentEnglishName },
          data: { size: input.englishName, sizeKey: input.englishName },
        });
      }
      return toSizeOption(updated);
    });
  }

  async deleteSize(englishName: string): Promise<boolean> {
    const result = await this.prisma.productSizeOption.deleteMany({ where: { englishName } });
    return result.count === 1;
  }

  async createColor(input: ProductColorInput): Promise<PublicProductColorOption> {
    return toColorOption(
      await this.prisma.productColorOption.create({ data: input, select: colorSelect }),
    );
  }

  async updateColor(
    currentEnglishName: string,
    input: ProductColorInput,
  ): Promise<PublicProductColorOption> {
    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.productColorOption.update({
        where: { englishName: currentEnglishName },
        data: input,
        select: colorSelect,
      });
      if (currentEnglishName !== input.englishName) {
        await transaction.productVariant.updateMany({
          where: { colorKey: currentEnglishName },
          data: { color: input.englishName, colorKey: input.englishName },
        });
      }
      return toColorOption(updated);
    });
  }

  async deleteColor(englishName: string): Promise<boolean> {
    const result = await this.prisma.productColorOption.deleteMany({ where: { englishName } });
    return result.count === 1;
  }
}
