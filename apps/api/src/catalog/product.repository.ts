import { Injectable } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import type { ProductListQuery } from './product.dto.js';

const CATEGORY_SELECT = { id: true, name: true } as const;
const INVENTORY_SELECT = { onHandQuantity: true, version: true } as const;
const IMAGE_SELECT = {
  id: true,
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
  priceRial: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;
const VARIANT_SELECT = {
  ...VARIANT_SCALAR_SELECT,
  inventory: { select: INVENTORY_SELECT },
} as const;
const PRODUCT_BASE_SELECT = {
  id: true,
  name: true,
  description: true,
  categoryId: true,
  status: true,
  imageVersion: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const PRODUCT_DETAIL_SELECT = {
  id: true,
  name: true,
  description: true,
  categoryId: true,
  category: { select: CATEGORY_SELECT },
  status: true,
  imageVersion: true,
  variants: { select: VARIANT_SELECT, orderBy: { id: 'asc' as const } },
  images: { select: IMAGE_SELECT, orderBy: { position: 'asc' as const } },
  createdAt: true,
  updatedAt: true,
} as const;

const PRODUCT_SUMMARY_SELECT = {
  id: true,
  name: true,
  category: { select: CATEGORY_SELECT },
  status: true,
  variants: {
    select: {
      priceRial: true,
      isActive: true,
      inventory: { select: { onHandQuantity: true } },
    },
  },
  images: {
    where: { position: 0 },
    select: IMAGE_SELECT,
    take: 1,
  },
  createdAt: true,
  updatedAt: true,
} as const;

export type ProductDetailRecord = Prisma.ProductGetPayload<{
  select: typeof PRODUCT_DETAIL_SELECT;
}>;
export type ProductSummaryRecord = Prisma.ProductGetPayload<{
  select: typeof PRODUCT_SUMMARY_SELECT;
}>;
export type ProductTransaction = Prisma.TransactionClient;

@Injectable()
export class ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ProductListQuery): Promise<{
    readonly categoryExists: boolean;
    readonly rows: ProductSummaryRecord[];
    readonly totalItems: number;
  }> {
    const where: Prisma.ProductWhereInput = {
      ...(query.categoryId === undefined ? {} : { categoryId: query.categoryId }),
      ...(query.status === undefined ? {} : { status: query.status }),
    };
    const categoryCount =
      query.categoryId === undefined
        ? 1
        : await this.prisma.category.count({ where: { id: query.categoryId } });
    const totalItems = await this.prisma.product.count({ where });
    const rows = await this.prisma.product.findMany({
      where,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      select: PRODUCT_SUMMARY_SELECT,
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
      orderBy: { id: 'asc' },
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
    return {
      ...product,
      category,
      variants: variantRows.map((variant) => ({
        ...variant,
        inventory: inventories.get(variant.id) ?? null,
      })),
      images,
    };
  }
}
