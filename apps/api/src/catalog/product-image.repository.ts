import { Injectable } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { ProductStatus } from '../generated/prisma/enums.js';

const IMAGE_SELECT = {
  id: true,
  productId: true,
  storageKey: true,
  mediaType: true,
  byteSize: true,
  width: true,
  height: true,
  position: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type ProductImageRecord = Prisma.ProductImageGetPayload<{ select: typeof IMAGE_SELECT }>;
export type ProductImageTransaction = Prisma.TransactionClient;

export interface LockedProductImageState {
  readonly id: string;
  readonly status: ProductStatus;
  readonly imageVersion: number;
}

@Injectable()
export class ProductImageRepository {
  constructor(private readonly prisma: PrismaService) {}

  transaction<T>(work: (transaction: ProductImageTransaction) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(work, { maxWait: 5000, timeout: 10000 });
  }

  async lockProduct(
    transaction: ProductImageTransaction,
    productId: string,
  ): Promise<LockedProductImageState | undefined> {
    const rows = await transaction.$queryRaw<LockedProductImageState[]>`
      SELECT id::text AS id, status::text AS status, image_version AS "imageVersion"
      FROM products
      WHERE id = ${productId}::uuid
      FOR UPDATE
    `;
    return rows[0];
  }

  async imageOwner(
    transaction: ProductImageTransaction,
    imageId: string,
  ): Promise<string | undefined> {
    const image = await transaction.productImage.findUnique({
      where: { id: imageId },
      select: { productId: true },
    });
    return image?.productId;
  }

  images(transaction: ProductImageTransaction, productId: string): Promise<ProductImageRecord[]> {
    return transaction.productImage.findMany({
      where: { productId },
      select: IMAGE_SELECT,
      orderBy: { position: 'asc' },
    });
  }

  createImage(
    transaction: ProductImageTransaction,
    data: {
      readonly productId: string;
      readonly storageKey: string;
      readonly mediaType: 'JPEG' | 'PNG' | 'WEBP';
      readonly byteSize: number;
      readonly width: number;
      readonly height: number;
      readonly position: number;
    },
  ): Promise<ProductImageRecord> {
    return transaction.productImage.create({ data, select: IMAGE_SELECT });
  }

  incrementVersion(transaction: ProductImageTransaction, productId: string): Promise<unknown> {
    return transaction.product.update({
      where: { id: productId },
      data: { imageVersion: { increment: 1 } },
      select: { imageVersion: true },
    });
  }

  async deferOrderConstraint(transaction: ProductImageTransaction): Promise<void> {
    await transaction.$executeRawUnsafe(
      'SET CONSTRAINTS product_images_product_id_position_key DEFERRED',
    );
  }

  async setPosition(
    transaction: ProductImageTransaction,
    imageId: string,
    position: number,
  ): Promise<void> {
    await transaction.productImage.update({ where: { id: imageId }, data: { position } });
  }

  async deleteImage(transaction: ProductImageTransaction, imageId: string): Promise<void> {
    await transaction.productImage.delete({ where: { id: imageId } });
  }

  async compactPositions(
    transaction: ProductImageTransaction,
    productId: string,
    removedPosition: number,
  ): Promise<void> {
    const remaining = await transaction.productImage.findMany({
      where: { productId, position: { gt: removedPosition } },
      select: { id: true, position: true },
      orderBy: { position: 'asc' },
    });
    for (const image of remaining) {
      await transaction.productImage.update({
        where: { id: image.id },
        data: { position: image.position - 1 },
      });
    }
  }

  createCleanup(
    transaction: ProductImageTransaction,
    storageKey: string,
  ): Promise<{ readonly id: string }> {
    return transaction.productImageCleanup.create({
      data: { storageKey },
      select: { id: true },
    });
  }

  createCleanupOutside(storageKey: string): Promise<{ readonly id: string }> {
    return this.prisma.productImageCleanup.create({
      data: { storageKey },
      select: { id: true },
    });
  }

  deleteCleanup(id: string): Promise<unknown> {
    return this.prisma.productImageCleanup.deleteMany({ where: { id } });
  }

  markCleanupFailure(id: string): Promise<unknown> {
    return this.prisma.productImageCleanup.updateMany({
      where: { id },
      data: {
        attemptCount: { increment: 1 },
        lastAttemptAt: new Date(),
        lastFailureCode: 'STORAGE_UNAVAILABLE',
      },
    });
  }

  pendingCleanups(): Promise<Array<{ readonly id: string; readonly storageKey: string }>> {
    return this.prisma.productImageCleanup.findMany({
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: 10,
      select: { id: true, storageKey: true },
    });
  }

  content(imageId: string, publicOnly: boolean): Promise<ProductImageRecord | null> {
    return this.prisma.productImage.findFirst({
      where: {
        id: imageId,
        ...(publicOnly ? { product: { status: 'ACTIVE' } } : {}),
      },
      select: IMAGE_SELECT,
    });
  }
}
