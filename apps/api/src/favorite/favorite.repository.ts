import { Injectable } from '@nestjs/common';

import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import type { FavoriteListQuery } from './favorite.dto.js';

const FAVORITE_VARIANT_ORDER_BY: Prisma.ProductVariantOrderByWithRelationInput[] = [
  { createdAt: 'asc' },
  { id: 'asc' },
];
const FAVORITE_PRODUCT_SELECT = {
  id: true,
  name: true,
  description: true,
  originalPriceRial: true,
  discountPercent: true,
  category: { select: { id: true, name: true } },
  variants: {
    where: { isActive: true },
    select: {
      image: { select: { id: true } },
    },
    orderBy: FAVORITE_VARIANT_ORDER_BY,
    take: 1,
  },
  images: {
    select: { id: true },
    orderBy: { position: 'asc' as const },
    take: 1,
  },
} as const;

export type FavoriteProductSummaryRecord = Prisma.ProductGetPayload<{
  select: typeof FAVORITE_PRODUCT_SELECT;
}> & {
  readonly quantity: bigint;
  readonly isAvailable: boolean;
};

@Injectable()
export class FavoriteRepository {
  constructor(private readonly prisma: PrismaService) {}

  // صفحه قطعی مشتری را همراه aggregate موجودی همه محصولات در تعداد query ثابت می‌سازد.
  async list(
    customerId: string,
    query: FavoriteListQuery,
  ): Promise<{ readonly rows: FavoriteProductSummaryRecord[]; readonly totalItems: number }> {
    const where = { customerId, product: { status: 'ACTIVE' as const } };
    const [totalItems, favorites] = await Promise.all([
      this.prisma.customerFavoriteItem.count({ where }),
      this.prisma.customerFavoriteItem.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: [{ createdAt: 'desc' }, { productId: 'desc' }],
        select: { product: { select: FAVORITE_PRODUCT_SELECT } },
      }),
    ]);
    const aggregates = await this.productAggregates(favorites.map(({ product }) => product.id));
    return {
      totalItems,
      rows: favorites.map(({ product }) => {
        const aggregate = aggregates.get(product.id);
        if (aggregate === undefined) throw new Error('Persisted Active Product has no active Variant.');
        return { ...product, ...aggregate };
      }),
    };
  }

  // وضعیت محصول را بدون بازگرداندن داده‌ای از محصولات ناموجود یا غیر Active بررسی می‌کند.
  productIsActive(productId: string): Promise<boolean> {
    return this.prisma.product
      .count({ where: { id: productId, status: 'ACTIVE' } })
      .then((count) => count === 1);
  }

  // unique مرکب را مرجع idempotency می‌گیرد تا درخواست‌های هم‌زمان رکورد تکراری نسازند.
  async add(customerId: string, productId: string): Promise<void> {
    await this.prisma.customerFavoriteItem.createMany({
      data: { customerId, productId },
      skipDuplicates: true,
    });
  }

  // حذف را به کلید مرکب مشتری جاری محدود می‌کند و نبود رکورد را موفق می‌داند.
  async remove(customerId: string, productId: string): Promise<void> {
    await this.prisma.customerFavoriteItem.deleteMany({ where: { customerId, productId } });
  }

  // موجودی محصولات همان صفحه را یک‌جا محاسبه می‌کند تا N+1 ایجاد نشود.
  private async productAggregates(productIds: readonly string[]): Promise<
    Map<string, { readonly quantity: bigint; readonly isAvailable: boolean }>
  > {
    if (productIds.length === 0) return new Map();
    const rows = await this.prisma.$queryRaw<
      Array<{ readonly productId: string; readonly quantity: bigint; readonly isAvailable: boolean }>
    >`
      SELECT
        variant.product_id::text AS "productId",
        SUM(inventory.on_hand_quantity) AS "quantity",
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
