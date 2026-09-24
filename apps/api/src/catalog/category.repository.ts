import { Injectable } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';

export const CATEGORY_SELECT = {
  id: true,
  name: true,
  nameKey: true,
  parentId: true,
  image: {
    select: {
      id: true,
      storageKey: true,
      mediaType: true,
      byteSize: true,
      width: true,
      height: true,
    },
  },
  createdAt: true,
  updatedAt: true,
} as const;

export type CategoryRecord = Prisma.CategoryGetPayload<{ select: typeof CATEGORY_SELECT }>;
export type CategoryTransaction = Prisma.TransactionClient;

@Injectable()
export class CategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  list(): Promise<CategoryRecord[]> {
    return this.prisma.category.findMany({
      select: CATEGORY_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  transaction<T>(work: (transaction: CategoryTransaction) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(
      async (transaction) => {
        await transaction.$queryRaw`
          SELECT pg_advisory_xact_lock(1120002, 1)::text AS lock_result
        `;
        return work(transaction);
      },
      { maxWait: 5000, timeout: 10000 },
    );
  }

  listInTransaction(transaction: CategoryTransaction): Promise<CategoryRecord[]> {
    return transaction.category.findMany({
      select: CATEGORY_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  content(imageId: string) {
    return this.prisma.categoryImage.findUnique({
      where: { id: imageId },
      select: { id: true, storageKey: true, mediaType: true, byteSize: true },
    });
  }

  createCleanupOutside(storageKey: string) {
    return this.prisma.categoryImageCleanup.create({ data: { storageKey }, select: { id: true } });
  }

  pendingCleanups() {
    return this.prisma.categoryImageCleanup.findMany({
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true, storageKey: true },
    });
  }

  deleteCleanup(id: string) {
    return this.prisma.categoryImageCleanup.deleteMany({ where: { id } });
  }

  markCleanupFailure(id: string) {
    return this.prisma.categoryImageCleanup.updateMany({
      where: { id },
      data: {
        attemptCount: { increment: 1 },
        lastAttemptAt: new Date(),
        lastFailureCode: 'DISCARD_FAILED',
      },
    });
  }
}
