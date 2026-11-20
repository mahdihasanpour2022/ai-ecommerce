import { Injectable } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import type { ProductListQuery } from './product.dto.js';

const VARIANT_ORDER_BY: Prisma.ProductVariantOrderByWithRelationInput[] = [
  { createdAt: 'asc' },
  { id: 'asc' },
];
const CATEGORY_SELECT = { id: true, name: true } as const;
const INVENTORY_SELECT = { onHandQuantity: true, version: true } as const;
const IMAGE_SELECT = {
  id: true,
  variantId: true,
  mediaType: true,
  byteSize: true,
  width: true,
  height: true,
  position: true,
  createdAt: true,
  updatedAt: true,
} as const;
const VARIANT_SCALAR_SELECT = {
  id: true,
  productId: true,
  sku: true,
  size: true,
  sizeKey: true,
  color: true,
  colorKey: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;
const VARIANT_SELECT = {
  ...VARIANT_SCALAR_SELECT,
  inventory: { select: INVENTORY_SELECT },
  image: { select: IMAGE_SELECT },
} as const;
const PRODUCT_BASE_SELECT = {
  id: true,
  name: true,
  description: true,
  tag: true,
  originalPriceRial: true,
  discountPercent: true,
  categoryId: true,
  status: true,
  imageVersion: true,
  specifications: true,
  mainSpecKeys: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const PRODUCT_DETAIL_SELECT = {
  id: true,
  name: true,
  description: true,
  tag: true,
  originalPriceRial: true,
  discountPercent: true,
  categoryId: true,
  category: { select: CATEGORY_SELECT },
  status: true,
  imageVersion: true,
  specifications: true,
  mainSpecKeys: true,
  variants: {
    select: VARIANT_SELECT,
    orderBy: VARIANT_ORDER_BY,
  },
  images: { select: IMAGE_SELECT, orderBy: { position: 'asc' as const } },
  createdAt: true,
  updatedAt: true,
} as const;

const PRODUCT_SUMMARY_SELECT = {
  id: true,
  name: true,
  description: true,
  tag: true,
  originalPriceRial: true,
  discountPercent: true,
  category: { select: CATEGORY_SELECT },
  status: true,
  variants: {
    select: {
      id: true,
      size: true,
      color: true,
      isActive: true,
      inventory: { select: { onHandQuantity: true } },
      image: { select: IMAGE_SELECT },
    },
    orderBy: VARIANT_ORDER_BY,
  },
  createdAt: true,
  updatedAt: true,
} as const;

export type ProductDetailRecord = Prisma.ProductGetPayload<{
  select: typeof PRODUCT_DETAIL_SELECT;
}>;
type ProductSummaryBaseRecord = Prisma.ProductGetPayload<{
  select: typeof PRODUCT_SUMMARY_SELECT;
}>;
export type ProductSummaryRecord = ProductSummaryBaseRecord & {
  readonly mainSpecs: Readonly<Record<string, string>>;
  readonly specificationCount: number;
};
export type ProductTransaction = Prisma.TransactionClient;

@Injectable()
export class ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ProductListQuery): Promise<{
    readonly categoryExists: boolean;
    readonly rows: ProductSummaryRecord[];
    readonly totalItems: number;
  }> {
    const variantFilter: Prisma.ProductVariantWhereInput = {
      ...(query.sizeKey === undefined ? {} : { sizeKey: query.sizeKey }),
      ...(query.colorKey === undefined ? {} : { colorKey: query.colorKey }),
    };
    const hasVariantFilter = Object.keys(variantFilter).length > 0;
    const inStock: Prisma.ProductVariantWhereInput = {
      inventory: { is: { onHandQuantity: { gt: 0 } } },
    };
    const where: Prisma.ProductWhereInput = {
      ...(query.name === undefined
        ? {}
        : { name: { contains: query.name, mode: 'insensitive' as const } }),
      ...(query.tags === undefined ? {} : { tag: { in: [...query.tags] } }),
      ...(query.categoryId === undefined ? {} : { categoryId: query.categoryId }),
      ...(query.status === undefined ? {} : { status: query.status }),
      ...(query.maximumDiscountPercent === undefined
        ? {}
        : { discountPercent: { lte: query.maximumDiscountPercent } }),
      ...(query.minimumPriceRial === undefined && query.maximumPriceRial === undefined
        ? {}
        : {
            originalPriceRial: {
              ...(query.minimumPriceRial === undefined ? {} : { gte: query.minimumPriceRial }),
              ...(query.maximumPriceRial === undefined ? {} : { lte: query.maximumPriceRial }),
            },
          }),
      ...(query.createdFrom === undefined && query.createdToExclusive === undefined
        ? {}
        : {
            createdAt: {
              ...(query.createdFrom === undefined ? {} : { gte: query.createdFrom }),
              ...(query.createdToExclusive === undefined ? {} : { lt: query.createdToExclusive }),
            },
          }),
      ...(hasVariantFilter ? { variants: { some: variantFilter } } : {}),
      ...(query.availability === 'IN_STOCK'
        ? { AND: [{ variants: { some: inStock } }] }
        : query.availability === 'OUT_OF_STOCK'
          ? { AND: [{ variants: { none: inStock } }] }
          : {}),
    };
    const categoryCount =
      query.categoryId === undefined
        ? 1
        : await this.prisma.category.count({ where: { id: query.categoryId } });
    const totalItems = await this.prisma.product.count({ where });
    const baseRows = await this.prisma.product.findMany({
      where,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: PRODUCT_SUMMARY_SELECT,
    });
    const specificationSummaries = await this.summarySpecifications(baseRows.map(({ id }) => id));
    const rows = baseRows.map((row) => {
      const summary = specificationSummaries.get(row.id);
      if (summary === undefined) {
        throw new Error('Persisted Product specification summary is missing.');
      }
      return { ...row, ...summary };
    });
    return { categoryExists: categoryCount === 1, rows, totalItems };
  }

  detail(id: string): Promise<ProductDetailRecord | null> {
    return this.prisma.product.findUnique({ where: { id }, select: PRODUCT_DETAIL_SELECT });
  }

  transaction<T>(work: (transaction: ProductTransaction) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(work, { maxWait: 5000, timeout: 10000 });
  }

  async categoryExists(transaction: ProductTransaction, categoryId: string): Promise<boolean> {
    const rows = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT id::text AS id
      FROM categories
      WHERE id = ${categoryId}::uuid
      FOR KEY SHARE
    `;
    return rows.length === 1;
  }

  async lockProduct(transaction: ProductTransaction, productId: string): Promise<boolean> {
    const rows = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT id::text AS id
      FROM products
      WHERE id = ${productId}::uuid
      FOR UPDATE
    `;
    return rows.length === 1;
  }

  aggregate(
    transaction: ProductTransaction,
    productId: string,
  ): Promise<ProductDetailRecord | null> {
    return this.loadAggregate(transaction, productId);
  }

  pendingImageCleanups(): Promise<Array<{ readonly id: string; readonly storageKey: string }>> {
    return this.prisma.productImageCleanup.findMany({
      orderBy: VARIANT_ORDER_BY,
      take: 10,
      select: { id: true, storageKey: true },
    });
  }

  deleteImageCleanup(id: string): Promise<unknown> {
    return this.prisma.productImageCleanup.deleteMany({ where: { id } });
  }

  markImageCleanupFailure(id: string): Promise<unknown> {
    return this.prisma.productImageCleanup.updateMany({
      where: { id },
      data: {
        attemptCount: { increment: 1 },
        lastAttemptAt: new Date(),
        lastFailureCode: 'STORAGE_UNAVAILABLE',
      },
    });
  }

  // فهرست Admin فقط سه مقدار منتخب و شمارش کل مشخصات را از JSONB استخراج می‌کند.
  private async summarySpecifications(productIds: readonly string[]): Promise<
    Map<
      string,
      {
        readonly mainSpecs: Readonly<Record<string, string>>;
        readonly specificationCount: number;
      }
    >
  > {
    if (productIds.length === 0) return new Map();
    const rows = await this.prisma.$queryRaw<
      Array<{
        readonly id: string;
        readonly key: string | null;
        readonly value: string | null;
        readonly specificationCount: number;
      }>
    >`
      SELECT
        product.id::text AS "id",
        selected.key AS "key",
        selected.value AS "value",
        jsonb_array_length(
          jsonb_path_query_array(product.specifications, '$.keyvalue()')
        )::integer AS "specificationCount"
      FROM products product
      LEFT JOIN LATERAL jsonb_each_text(product.specifications) AS selected(key, value)
        ON selected.key = ANY(product.main_spec_keys)
      WHERE product.id = ANY(ARRAY[${Prisma.join(productIds)}]::uuid[])
      ORDER BY product.id, array_position(product.main_spec_keys, selected.key)
    `;
    const summaries = new Map<
      string,
      { readonly mainSpecs: Record<string, string>; readonly specificationCount: number }
    >();
    for (const row of rows) {
      const summary = summaries.get(row.id) ?? {
        mainSpecs: {},
        specificationCount: row.specificationCount,
      };
      if ((row.key === null) !== (row.value === null)) {
        throw new Error('Persisted main Product specification is malformed.');
      }
      if (row.key !== null && row.value !== null) summary.mainSpecs[row.key] = row.value;
      summaries.set(row.id, summary);
    }
    return summaries;
  }

  private async loadAggregate(
    transaction: ProductTransaction,
    productId: string,
  ): Promise<ProductDetailRecord | null> {
    const product = await transaction.product.findUnique({
      where: { id: productId },
      select: PRODUCT_BASE_SELECT,
    });
    if (product === null) return null;
    const category = await transaction.category.findUnique({
      where: { id: product.categoryId },
      select: CATEGORY_SELECT,
    });
    if (category === null) throw new Error('Persisted Product Category is missing.');
    const variantRows = await transaction.productVariant.findMany({
      where: { productId },
      select: VARIANT_SCALAR_SELECT,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    const inventoryRows = await transaction.inventory.findMany({
      where: { variantId: { in: variantRows.map(({ id }) => id) } },
      select: { variantId: true, ...INVENTORY_SELECT },
    });
    const inventories = new Map(
      inventoryRows.map((inventory) => [
        inventory.variantId,
        { onHandQuantity: inventory.onHandQuantity, version: inventory.version },
      ]),
    );
    const images = await transaction.productImage.findMany({
      where: { productId },
      select: IMAGE_SELECT,
      orderBy: { position: 'asc' },
    });
    // تصویر متصل به هر واریانت در aggregate محصول قرار می‌گیرد.
    const imagesByVariant = new Map(
      images.flatMap((image) =>
        image.variantId === null ? [] : [[image.variantId, image] as const],
      ),
    );
    return {
      ...product,
      category,
      variants: variantRows.map((variant) => ({
        ...variant,
        inventory: inventories.get(variant.id) ?? null,
        image: imagesByVariant.get(variant.id) ?? null,
      })),
      images,
    };
  }
}
