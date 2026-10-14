import { Injectable } from '@nestjs/common';

import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';

export const BANNER_SELECT = {
  id: true,
  storageKey: true,
  mediaType: true,
  byteSize: true,
  width: true,
  height: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type BannerRecord = Prisma.BannerGetPayload<{ select: typeof BANNER_SELECT }>;
export type BannerTransaction = Prisma.TransactionClient;

@Injectable()
export class BannerRepository {
  constructor(private readonly prisma: PrismaService) {}

  // بنرها را با ترتیب پایدار جدیدترین ابتدا برمی‌گرداند.
  list(): Promise<BannerRecord[]> {
    return this.prisma.banner.findMany({
      select: BANNER_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  // جهش‌های بنر را برای هماهنگی رکورد و cleanup سریال می‌کند.
  transaction<T>(work: (transaction: BannerTransaction) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(
      async (transaction) => {
        await transaction.$queryRaw`SELECT pg_advisory_xact_lock(1120003, 1)::text AS lock_result`;
        return work(transaction);
      },
      { maxWait: 5000, timeout: 10000 },
    );
  }

  // محتوای بنر را فقط با metadata ذخیره‌شده بازیابی می‌کند.
  content(id: string): Promise<BannerRecord | null> {
    return this.prisma.banner.findUnique({ where: { id }, select: BANNER_SELECT });
  }

  createCleanupOutside(storageKey: string) {
    return this.prisma.bannerImageCleanup.create({ data: { storageKey }, select: { id: true } });
  }

  pendingCleanups() {
    return this.prisma.bannerImageCleanup.findMany({
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: 10,
      select: { id: true, storageKey: true },
    });
  }

  deleteCleanup(id: string) {
    return this.prisma.bannerImageCleanup.deleteMany({ where: { id } });
  }

  markCleanupFailure(id: string) {
    return this.prisma.bannerImageCleanup.updateMany({
      where: { id },
      data: {
        attemptCount: { increment: 1 },
        lastAttemptAt: new Date(),
        lastFailureCode: 'DISCARD_FAILED',
      },
    });
  }
}
