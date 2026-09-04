import { Injectable } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import type { PublicProductListQuery } from './public-catalog.dto.js';

const PUBLIC_CATEGORY_SELECT = { id: true, name: true, parentId: true } as const;
const PUBLIC_IMAGE_SELECT = {
  id: true,
  mediaType: true,
  width: true,
  height: true,
} as const;
const PUBLIC_VARIANT_SELECT = {
  id: true,
  size: true,
  color: true,
  priceRial: true,
  inventory: { select: { onHandQuantity: true } },
} as const;
const PUBLIC_LIST_SELECT = {
  id: true,
  name: true,
  category: { select: { id: true, name: true } },
  images: {
    where: { position: 0 },
    select: PUBLIC_IMAGE_SELECT,
    take: 1,
  },
} as const;
const PUBLIC_DETAIL_SELECT = {
  ...PUBLIC_LIST_SELECT,
  description: true,
  categoryId: true,
  variants: {
    where: { isActive: true },
    select: PUBLIC_VARIANT_SELECT,
    orderBy: { id: 'asc' as const },
  },
  images: {
    select: PUBLIC_IMAGE_SELECT,
    orderBy: { position: 'asc' as const },
  },
} as const;

export type PublicCategoryRecord = Prisma.CategoryGetPayload<{
  select: typeof PUBLIC_CATEGORY_SELECT;
}>;
type PublicProductListBase = Prisma.ProductGetPayload<{ select: typeof PUBLIC_LIST_SELECT }>;
export type PublicProductSummaryRecord = PublicProductListBase & {
  readonly minimumPriceRial: bigint;
  readonly maximumPriceRial: bigint;
  readonly isAvailable: boolean;
};
export type PublicProductDetailRecord = Prisma.ProductGetPayload<{
  select: typeof PUBLIC_DETAIL_SELECT;
}>;

@Injectable()
export class PublicCatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  categories(): Promise<PublicCategoryRecord[]> {
    return this.prisma.category.findMany({
      select: PUBLIC_CATEGORY_SELECT,
      orderBy: [{ nameKey: 'asc' }, { id: 'asc' }],
    });
  }

  async products(query: PublicProductListQuery): Promise<{
    readonly categoryExists: boolean;
    readonly rows: PublicProductSummaryRecord[];
    readonly totalItems: number;
  }> {
    const where: Prisma.ProductWhereInput = {
      status: 'ACTIVE',
      ...(query.categoryId === undefined ? {} : { categoryId: query.categoryId }),
    };
    const categoryCount =
      query.categoryId === undefined
        ? 1
        : await this.prisma.category.count({ where: { id: query.categoryId } });
    const [totalItems, baseRows] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: PUBLIC_LIST_SELECT,
      }),
    ]);
    const aggregates = await this.productAggregates(baseRows.map(({ id }) => id));
    const rows = baseRows.map((row) => {
      const aggregate = aggregates.get(row.id);
      if (aggregate === undefined)
        throw new Error('Persisted Active Product has no active Variant.');
      return { ...row, ...aggregate };
    });
    return { categoryExists: categoryCount === 1, rows, totalItems };
  }

  product(id: string): Promise<PublicProductDetailRecord | null> {
    return this.prisma.product.findFirst({
      where: { id, status: 'ACTIVE' },
      select: PUBLIC_DETAIL_SELECT,
    });
  }

  categoryPath(categoryId: string): Promise<Array<{ readonly id: string; readonly name: string }>> {
    return this.prisma.$queryRaw`
      WITH RECURSIVE category_path AS (
        SELECT id, name, parent_id, 1 AS depth
        FROM categories
        WHERE id = ${categoryId}::uuid
        UNION ALL
        SELECT parent.id, parent.name, parent.parent_id, child.depth + 1
        FROM categories parent
        INNER JOIN category_path child ON parent.id = child.parent_id
        WHERE child.depth < 6
      )
      SELECT id::text AS id, name
      FROM category_path
      ORDER BY depth DESC
    `;
  }

  private async productAggregates(productIds: readonly string[]): Promise<
    Map<
      string,
      {
        readonly minimumPriceRial: bigint;
        readonly maximumPriceRial: bigint;
        readonly isAvailable: boolean;
      }
    >
  > {
    if (productIds.length === 0) return new Map();
    const rows = await this.prisma.$queryRaw<
      Array<{
        readonly productId: string;
        readonly minimumPriceRial: bigint;
        readonly maximumPriceRial: bigint;
        readonly isAvailable: boolean;
      }>
    >`
      SELECT
        variant.product_id::text AS "productId",
        MIN(variant.price_rial) AS "minimumPriceRial",
        MAX(variant.price_rial) AS "maximumPriceRial",
        BOOL_OR(inventory.on_hand_quantity > 0) AS "isAvailable"
      FROM product_variants variant
      INNER JOIN inventories inventory ON inventory.variant_id = variant.id
      WHERE variant.is_active = true
        AND variant.product_id = ANY(ARRAY[${Prisma.join(productIds)}]::uuid[])
      GROUP BY variant.product_id
    `;
    return new Map(rows.map(({ productId, ...aggregate }) => [productId, aggregate]));
  }
}
