import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CategoryRepository } from '../src/catalog/category.repository.js';
import { ProductRepository } from '../src/catalog/product.repository.js';
import type { PrismaService } from '../src/database/prisma.service.js';

void test('orders protected Category reads by newest creation time and UUID', async () => {
  let listOptions: unknown;
  let transactionOptions: unknown;
  const category = {
    findMany: (options: unknown) => {
      if (listOptions === undefined) listOptions = options;
      else transactionOptions = options;
      return Promise.resolve([]);
    },
  };
  const repository = new CategoryRepository({ category } as unknown as PrismaService);

  await repository.list();
  await repository.listInTransaction({ category } as never);

  const expected = [{ createdAt: 'desc' }, { id: 'desc' }];
  assert.deepEqual((listOptions as { orderBy: unknown }).orderBy, expected);
  assert.deepEqual((transactionOptions as { orderBy: unknown }).orderBy, expected);
});

void test('orders protected paginated Product reads by newest creation time and UUID', async () => {
  let findManyOptions: unknown;
  const repository = new ProductRepository({
    category: { count: () => Promise.resolve(1) },
    product: {
      count: () => Promise.resolve(0),
      findMany: (options: unknown) => {
        findManyOptions = options;
        return Promise.resolve([]);
      },
    },
  } as unknown as PrismaService);

  await repository.list({ page: 2, pageSize: 15 });

  const options = findManyOptions as {
    readonly skip: number;
    readonly take: number;
    readonly orderBy: unknown;
  };
  assert.equal(options.skip, 15);
  assert.equal(options.take, 15);
  assert.deepEqual(options.orderBy, [{ createdAt: 'desc' }, { id: 'desc' }]);
});
