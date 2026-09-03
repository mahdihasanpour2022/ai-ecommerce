import { Injectable } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';

export const CATEGORY_SELECT = {
  id: true,
  name: true,
  nameKey: true,
  parentId: true,
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
      orderBy: [{ nameKey: 'asc' }, { id: 'asc' }],
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
      orderBy: [{ nameKey: 'asc' }, { id: 'asc' }],
    });
  }
}
