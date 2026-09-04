import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, test } from 'node:test';

import { ProductImageError } from '../src/catalog/product-image.errors.js';
import { ProductImageStorage } from '../src/catalog/product-image.storage.js';
import { createTestEnvironment } from './test-environment.js';

const roots: string[] = [];

async function storage(): Promise<{ root: string; storage: ProductImageStorage }> {
  const root = await mkdtemp(join(tmpdir(), 'product-image-storage-'));
  roots.push(root);
  return {
    root,
    storage: new ProductImageStorage(
      createTestEnvironment('test', { PRODUCT_IMAGE_STORAGE_ROOT: root }),
    ),
  };
}

async function unavailable(work: () => Promise<unknown>): Promise<void> {
  await assert.rejects(work, (error: unknown) => {
    assert.ok(error instanceof ProductImageError);
    assert.equal(error.code, 'PRODUCT_IMAGE_STORAGE_UNAVAILABLE');
    return true;
  });
}

void afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

void describe('Product Image local storage', () => {
  void test('stages, promotes, reads, and idempotently discards opaque generated keys', async () => {
    const context = await storage();
    const bytes = Buffer.from('safe-image-bytes');
    const prepared = await context.storage.prepare(bytes, 'webp');
    assert.match(prepared.storageKey, /^objects\/[0-9a-f-]+\.webp$/u);
    assert.match(prepared.stagingKey, /^\.staging\/[0-9a-f-]+\.tmp$/u);
    assert.deepEqual(await readFile(join(context.root, ...prepared.stagingKey.split('/'))), bytes);

    await context.storage.promote(prepared);
    assert.deepEqual(await context.storage.read(prepared.storageKey), bytes);
    await context.storage.discard(prepared.storageKey);
    await context.storage.discard(prepared.storageKey);
  });

  void test('rejects caller-controlled traversal and malformed keys', async () => {
    const context = await storage();
    for (const key of ['../outside.webp', 'objects/name.webp', '/objects/name.webp']) {
      await unavailable(() => context.storage.read(key));
      await unavailable(() => context.storage.discard(key));
    }
  });

  void test('fails closed when production has no approved provider', async () => {
    const production = new ProductImageStorage(createTestEnvironment('production'));
    await unavailable(() => production.prepare(Buffer.from([1]), 'png'));
    await unavailable(() => production.read('objects/00000000-0000-4000-8000-000000000000.png'));
  });
});
