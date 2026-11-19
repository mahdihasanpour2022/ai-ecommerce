import assert from 'node:assert/strict';
import { randomInt, randomUUID } from 'node:crypto';
import { after, before, beforeEach, describe, test } from 'node:test';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../src/generated/prisma/client.js';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

// کلاینت تست را فقط به دیتابیس disposable مورد تأیید متصل می‌کند.
function createClient(): PrismaClient {
  assert.ok(testDatabaseUrl);
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: testDatabaseUrl }),
  });
}

void describe(
  'Customer Favorite PostgreSQL constraints',
  { skip: testDatabaseUrl === undefined, concurrency: 1 },
  () => {
    let prisma: PrismaClient;

    // داده‌های متعلق به سناریوهای علاقه‌مندی را با ترتیب امن وابستگی‌ها پاک می‌کند.
    async function cleanup(): Promise<void> {
      await prisma.$transaction(async (transaction) => {
        await transaction.customerFavoriteItem.deleteMany();
        await transaction.inventory.deleteMany();
        await transaction.productVariant.deleteMany();
        await transaction.product.deleteMany();
        await transaction.category.deleteMany();
        await transaction.customer.deleteMany();
      });
    }

    // یک مشتری و محصول مستقل برای آزمودن قیود association می‌سازد.
    async function createFixture(): Promise<{ customerId: string; productId: string }> {
      const customer = await prisma.customer.create({
        data: {
          mobile: `+989${randomInt(100_000_000, 1_000_000_000)}`,
          firstName: 'علی',
          lastName: 'احمدی',
        },
        select: { id: true },
      });
      const category = await prisma.category.create({
        data: {
          name: `Favorite ${randomUUID()}`,
          nameKey: `favorite-${randomUUID()}`,
        },
        select: { id: true },
      });
      const product = await prisma.$transaction(async (transaction) => {
        const created = await transaction.product.create({
          data: {
            name: `Favorite Product ${randomUUID()}`,
            originalPriceRial: 1000n,
            categoryId: category.id,
          },
          select: { id: true },
        });
        const variant = await transaction.productVariant.create({
          data: {
            productId: created.id,
            sku: `FAVORITE-${randomUUID()}`.toUpperCase(),
          },
          select: { id: true },
        });
        await transaction.inventory.create({ data: { variantId: variant.id } });

        return created;
      });

      return { customerId: customer.id, productId: product.id };
    }

    // وابستگی‌های Catalog را پیش از حذف Product پاک می‌کند تا Cascade علاقه‌مندی سنجیده شود.
    async function deleteProduct(productId: string): Promise<void> {
      await prisma.$transaction(async (transaction) => {
        const variants = await transaction.productVariant.findMany({
          where: { productId },
          select: { id: true },
        });
        await transaction.inventory.deleteMany({
          where: { variantId: { in: variants.map(({ id }) => id) } },
        });
        await transaction.productVariant.deleteMany({ where: { productId } });
        await transaction.product.delete({ where: { id: productId } });
      });
    }

    void before(async () => {
      prisma = createClient();
      await prisma.$connect();
    });

    void beforeEach(cleanup);

    void after(async () => {
      await cleanup();
      await prisma.$disconnect();
    });

    void test('keeps each Customer and Product pair unique', async () => {
      const fixture = await createFixture();
      await prisma.customerFavoriteItem.create({ data: fixture });

      await assert.rejects(prisma.customerFavoriteItem.create({ data: fixture }));
      assert.equal(await prisma.customerFavoriteItem.count({ where: fixture }), 1);
    });

    void test('rejects orphan Customer and Product references', async () => {
      const fixture = await createFixture();

      await assert.rejects(
        prisma.customerFavoriteItem.create({
          data: { customerId: randomUUID(), productId: fixture.productId },
        }),
      );
      await assert.rejects(
        prisma.customerFavoriteItem.create({
          data: { customerId: fixture.customerId, productId: randomUUID() },
        }),
      );
    });

    void test('removes dependent favorites when either owner is deleted', async () => {
      const first = await createFixture();
      await prisma.customerFavoriteItem.create({ data: first });
      await deleteProduct(first.productId);
      assert.equal(await prisma.customerFavoriteItem.count({ where: first }), 0);

      const second = await createFixture();
      await prisma.customerFavoriteItem.create({ data: second });
      await prisma.customer.delete({ where: { id: second.customerId } });
      assert.equal(await prisma.customerFavoriteItem.count({ where: second }), 0);
    });
  },
);
