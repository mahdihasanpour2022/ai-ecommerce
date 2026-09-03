import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, beforeEach, describe, test } from 'node:test';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../src/generated/prisma/client.js';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

function createClient(): PrismaClient {
  assert.ok(testDatabaseUrl);
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: testDatabaseUrl }),
  });
}

void describe(
  'catalog PostgreSQL concurrency invariants',
  { skip: testDatabaseUrl === undefined, concurrency: 1 },
  () => {
    let primary: PrismaClient;
    let contenderA: PrismaClient;
    let contenderB: PrismaClient;

    async function clearCatalog(): Promise<void> {
      await primary.$transaction(async (transaction) => {
        await transaction.productImage.deleteMany();
        await transaction.inventory.deleteMany();
        await transaction.productVariant.deleteMany();
        await transaction.product.deleteMany();
        await transaction.category.deleteMany();
        await transaction.productImageCleanup.deleteMany();
      });
    }

    async function createDraftProduct(): Promise<{
      categoryId: string;
      productId: string;
      variantId: string;
    }> {
      const categoryId = randomUUID();
      const productId = randomUUID();
      const variantId = randomUUID();

      await primary.category.create({
        data: { id: categoryId, name: 'Concurrency Root', nameKey: 'concurrency root' },
      });
      await primary.$transaction(async (transaction) => {
        await transaction.product.create({
          data: { id: productId, name: 'Concurrency Product', categoryId },
        });
        await transaction.productVariant.create({
          data: {
            id: variantId,
            productId,
            sku: `BASE-${variantId}`.toUpperCase(),
            priceRial: 1000n,
          },
        });
        await transaction.inventory.create({ data: { variantId } });
      });

      return { categoryId, productId, variantId };
    }

    void before(async () => {
      primary = createClient();
      contenderA = createClient();
      contenderB = createClient();
      await Promise.all([primary.$connect(), contenderA.$connect(), contenderB.$connect()]);
    });

    void beforeEach(clearCatalog);

    void after(async () => {
      await clearCatalog();
      await Promise.all([
        primary.$disconnect(),
        contenderA.$disconnect(),
        contenderB.$disconnect(),
      ]);
    });

    void test('serializes conflicting root Category creation to one winner', async () => {
      const outcomes = await Promise.allSettled([
        contenderA.category.create({
          data: { id: randomUUID(), name: 'Race Root A', nameKey: 'race root' },
        }),
        contenderB.category.create({
          data: { id: randomUUID(), name: 'Race Root B', nameKey: 'race root' },
        }),
      ]);

      assert.equal(outcomes.filter(({ status }) => status === 'fulfilled').length, 1);
      assert.equal(outcomes.filter(({ status }) => status === 'rejected').length, 1);
      assert.equal(await primary.category.count({ where: { nameKey: 'race root' } }), 1);
    });

    void test('serializes opposing Category moves without creating a cycle', async () => {
      const categoryA = randomUUID();
      const categoryB = randomUUID();
      await primary.category.createMany({
        data: [
          { id: categoryA, name: 'Move A', nameKey: 'move a' },
          { id: categoryB, name: 'Move B', nameKey: 'move b' },
        ],
      });

      const outcomes = await Promise.allSettled([
        contenderA.category.update({
          where: { id: categoryA },
          data: { parentId: categoryB },
        }),
        contenderB.category.update({
          where: { id: categoryB },
          data: { parentId: categoryA },
        }),
      ]);

      assert.equal(outcomes.filter(({ status }) => status === 'fulfilled').length, 1);
      assert.equal(outcomes.filter(({ status }) => status === 'rejected').length, 1);
      const categories = await primary.category.findMany({
        where: { id: { in: [categoryA, categoryB] } },
        select: { id: true, parentId: true },
      });
      assert.equal(categories.filter(({ parentId }) => parentId !== null).length, 1);
    });

    void test('selects one winner for concurrent global SKU insertion', async () => {
      const { productId } = await createDraftProduct();
      const sharedSku = `RACE-${randomUUID()}`.toUpperCase();

      const insertVariant = async (client: PrismaClient, size: string): Promise<void> => {
        await client.$transaction(async (transaction) => {
          const variant = await transaction.productVariant.create({
            data: {
              id: randomUUID(),
              productId,
              sku: sharedSku,
              size,
              sizeKey: size.toLowerCase(),
              priceRial: 1000n,
              isActive: false,
            },
          });
          await transaction.inventory.create({ data: { variantId: variant.id } });
        });
      };

      const outcomes = await Promise.allSettled([
        insertVariant(contenderA, 'Small'),
        insertVariant(contenderB, 'Large'),
      ]);

      assert.equal(outcomes.filter(({ status }) => status === 'fulfilled').length, 1);
      assert.equal(await primary.productVariant.count({ where: { sku: sharedSku } }), 1);
    });

    void test('selects one winner for concurrent nullable-combination insertion', async () => {
      const { productId } = await createDraftProduct();

      const insertVariant = async (client: PrismaClient, sku: string): Promise<void> => {
        await client.$transaction(async (transaction) => {
          const variant = await transaction.productVariant.create({
            data: {
              id: randomUUID(),
              productId,
              sku,
              size: 'Medium',
              sizeKey: 'medium',
              color: null,
              colorKey: null,
              priceRial: 1000n,
              isActive: false,
            },
          });
          await transaction.inventory.create({ data: { variantId: variant.id } });
        });
      };

      const outcomes = await Promise.allSettled([
        insertVariant(contenderA, `COMBO-A-${randomUUID()}`.toUpperCase()),
        insertVariant(contenderB, `COMBO-B-${randomUUID()}`.toUpperCase()),
      ]);

      assert.equal(outcomes.filter(({ status }) => status === 'fulfilled').length, 1);
      assert.equal(
        await primary.productVariant.count({
          where: { productId, sizeKey: 'medium', colorKey: null },
        }),
        1,
      );
    });

    void test('allows exactly one Inventory update from the same version', async () => {
      const { variantId } = await createDraftProduct();

      const outcomes = await Promise.all([
        contenderA.inventory.updateMany({
          where: { variantId, version: 1 },
          data: { onHandQuantity: 7, version: { increment: 1 } },
        }),
        contenderB.inventory.updateMany({
          where: { variantId, version: 1 },
          data: { onHandQuantity: 11, version: { increment: 1 } },
        }),
      ]);

      assert.deepEqual(outcomes.map(({ count }) => count).sort(), [0, 1]);
      const inventory = await primary.inventory.findUniqueOrThrow({ where: { variantId } });
      assert.equal(inventory.version, 2);
      assert.ok(inventory.onHandQuantity === 7 || inventory.onHandQuantity === 11);
    });

    void test('allows exactly one Image aggregate mutation per imageVersion', async () => {
      const { productId } = await createDraftProduct();

      const mutateImages = async (client: PrismaClient, suffix: string): Promise<void> => {
        await client.$transaction(async (transaction) => {
          const guarded = await transaction.product.updateMany({
            where: { id: productId, imageVersion: 1 },
            data: { imageVersion: { increment: 1 } },
          });
          if (guarded.count !== 1) {
            throw new Error('stale image version');
          }
          await transaction.productImage.create({
            data: {
              id: randomUUID(),
              productId,
              storageKey: `catalog/test/${suffix}-${randomUUID()}.webp`,
              mediaType: 'WEBP',
              byteSize: 1024,
              width: 100,
              height: 100,
              position: 0,
            },
          });
        });
      };

      const outcomes = await Promise.allSettled([
        mutateImages(contenderA, 'a'),
        mutateImages(contenderB, 'b'),
      ]);

      assert.equal(outcomes.filter(({ status }) => status === 'fulfilled').length, 1);
      assert.equal(await primary.productImage.count({ where: { productId } }), 1);
      assert.equal(
        (await primary.product.findUniqueOrThrow({ where: { id: productId } })).imageVersion,
        2,
      );
    });
  },
);
