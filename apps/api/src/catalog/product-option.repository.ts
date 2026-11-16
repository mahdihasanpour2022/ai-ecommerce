import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type {
  ProductColorInput,
  ProductSizeInput,
  ProductTagInput,
  ProductTagOption,
  PublicProductColorOption,
  PublicProductSizeOption,
} from './product-option.dto.js';

const colorSelect = { englishName: true, persianName: true, hexCode: true } as const;
const sizeSelect = { englishName: true } as const;
const tagSelect = { englishName: true } as const;

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

function toSizeOption(row: { readonly englishName: string }): PublicProductSizeOption {
  return {
    'english-size-name': row.englishName,
  };
}

function toTagOption(row: { readonly englishName: string }): ProductTagOption {
  return { 'english-tag-name': row.englishName };
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

  async tags(): Promise<ProductTagOption[]> {
    const rows = await this.prisma.productTagOption.findMany({
      orderBy: [{ createdAt: 'asc' }, { englishName: 'asc' }],
      select: tagSelect,
    });
    return rows.map(toTagOption);
  }

  async createTag(input: ProductTagInput): Promise<ProductTagOption> {
    return toTagOption(
      await this.prisma.productTagOption.create({ data: input, select: tagSelect }),
    );
  }

  // تغییر نام برچسب را هم‌زمان روی محصولاتی که از آن استفاده می‌کنند اعمال می‌کند.
  async updateTag(currentEnglishName: string, input: ProductTagInput): Promise<ProductTagOption> {
    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.productTagOption.update({
        where: { englishName: currentEnglishName },
        data: input,
        select: tagSelect,
      });
      if (currentEnglishName !== input.englishName) {
        await transaction.product.updateMany({
          where: { tag: currentEnglishName },
          data: { tag: input.englishName },
        });
      }
      return toTagOption(updated);
    });
  }

  // حذف برچسب، مقدار آن را از محصولات مرتبط نیز پاک می‌کند تا داده منسوخ باقی نماند.
  async deleteTag(englishName: string): Promise<boolean> {
    return this.prisma.$transaction(async (transaction) => {
      const deleted = await transaction.productTagOption.deleteMany({ where: { englishName } });
      if (deleted.count === 0) return false;
      await transaction.product.updateMany({ where: { tag: englishName }, data: { tag: null } });
      return true;
    });
  }

  async createSize(input: ProductSizeInput): Promise<PublicProductSizeOption> {
    return toSizeOption(
      await this.prisma.productSizeOption.create({
        data: { englishName: input.englishName, persianName: input.englishName },
        select: sizeSelect,
      }),
    );
  }

  async updateSize(
    currentEnglishName: string,
    input: ProductSizeInput,
  ): Promise<PublicProductSizeOption> {
    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.productSizeOption.update({
        where: { englishName: currentEnglishName },
        data: { englishName: input.englishName, persianName: input.englishName },
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
