import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { describe, test } from 'node:test';

import type {
  ProductImageUploadInput,
  ValidatedProductImage,
} from '../src/catalog/product-image.dto.js';
import { ProductImageError } from '../src/catalog/product-image.errors.js';
import type {
  ProductImageRecord,
  ProductImageRepository,
} from '../src/catalog/product-image.repository.js';
import { ProductImageService } from '../src/catalog/product-image.service.js';
import type { ProductImageStorage } from '../src/catalog/product-image.storage.js';

const productId = randomUUID();
const imageId = randomUUID();
const replacementId = randomUUID();
const now = new Date('2026-01-01T00:00:00.000Z');
const input: ProductImageUploadInput = {
  imageVersion: 1,
  file: { fieldname: 'file', mimetype: 'image/png', size: 3, buffer: Buffer.from([1, 2, 3]) },
};
const validated: ValidatedProductImage = {
  bytes: input.file.buffer,
  mediaType: 'PNG',
  extension: 'png',
  byteSize: 3,
  width: 1,
  height: 1,
};

function image(id: string, storageKey: string): ProductImageRecord {
  return {
    id,
    productId,
    storageKey,
    mediaType: 'PNG',
    byteSize: 3,
    width: 1,
    height: 1,
    position: 0,
    createdAt: now,
    updatedAt: now,
  };
}

function service(
  repository: Record<string, unknown>,
  storage: Record<string, unknown>,
): ProductImageService {
  const validator = { validate: () => Promise.resolve(validated) };
  return new ProductImageService(
    repository as unknown as ProductImageRepository,
    storage as unknown as ProductImageStorage,
    validator,
  );
}

void describe('Product Image side-effect compensation and cleanup', () => {
  void test('removes promoted bytes when database publication fails', async () => {
    const discarded: string[] = [];
    const repository = {
      pendingCleanups: () => Promise.resolve([]),
      transaction: () => Promise.reject(new Error('database unavailable')),
      createCleanupOutside: () => Promise.resolve({ id: randomUUID() }),
    };
    const storage = {
      prepare: () =>
        Promise.resolve({ storageKey: 'objects/new.png', stagingKey: '.staging/new.tmp' }),
      promote: () => Promise.resolve(),
      discard: (key: string) => {
        discarded.push(key);
        return Promise.resolve();
      },
    };

    await assert.rejects(() => service(repository, storage).upload(productId, input));
    assert.deepEqual(discarded, ['objects/new.png']);
  });

  void test('durably records a failed compensation without replacing the original failure', async () => {
    const recorded: string[] = [];
    const repository = {
      pendingCleanups: () => Promise.resolve([]),
      transaction: () => Promise.reject(new Error('publication failed')),
      createCleanupOutside: (storageKey: string) => {
        recorded.push(storageKey);
        return Promise.resolve({ id: randomUUID() });
      },
    };
    const storage = {
      prepare: () =>
        Promise.resolve({ storageKey: 'objects/new.png', stagingKey: '.staging/new.tmp' }),
      promote: () => Promise.resolve(),
      discard: () => Promise.reject(new ProductImageError('PRODUCT_IMAGE_STORAGE_UNAVAILABLE')),
    };

    await assert.rejects(
      () => service(repository, storage).upload(productId, input),
      /publication failed/u,
    );
    assert.deepEqual(recorded, ['objects/new.png']);
  });

  void test('discards staging when promotion fails', async () => {
    const discarded: string[] = [];
    const repository = { pendingCleanups: () => Promise.resolve([]) };
    const storage = {
      prepare: () =>
        Promise.resolve({ storageKey: 'objects/new.png', stagingKey: '.staging/new.tmp' }),
      promote: () => Promise.reject(new ProductImageError('PRODUCT_IMAGE_STORAGE_UNAVAILABLE')),
      discard: (key: string) => {
        discarded.push(key);
        return Promise.resolve();
      },
    };

    await assert.rejects(
      () => service(repository, storage).upload(productId, input),
      (error: unknown) =>
        error instanceof ProductImageError && error.code === 'PRODUCT_IMAGE_STORAGE_UNAVAILABLE',
    );
    assert.deepEqual(discarded, ['.staging/new.tmp']);
  });

  void test('records failed post-commit deletion and retries it idempotently', async () => {
    const oldKey = 'objects/old.png';
    const cleanupId = randomUUID();
    const discarded: string[] = [];
    const deletedCleanup: string[] = [];
    const failedCleanup: string[] = [];
    let retryPending = false;
    let oldDiscardAttempts = 0;
    const oldImage = image(imageId, oldKey);
    const newImage = image(replacementId, 'objects/new.png');
    const repository = {
      pendingCleanups: () =>
        Promise.resolve(retryPending ? [{ id: cleanupId, storageKey: oldKey }] : []),
      transaction: (work: (transaction: object) => Promise<unknown>) => work({}),
      imageOwner: () => Promise.resolve(productId),
      lockProduct: () => Promise.resolve({ id: productId, status: 'DRAFT', imageVersion: 1 }),
      images: (() => {
        let call = 0;
        return () => Promise.resolve(call++ === 0 ? [oldImage] : [newImage]);
      })(),
      deferOrderConstraint: () => Promise.resolve(),
      createCleanup: () => Promise.resolve({ id: cleanupId }),
      deleteImage: () => Promise.resolve(),
      createImage: () => Promise.resolve(newImage),
      incrementVersion: () => Promise.resolve({ imageVersion: 2 }),
      deleteCleanup: (id: string) => {
        deletedCleanup.push(id);
        return Promise.resolve();
      },
      markCleanupFailure: (id: string) => {
        failedCleanup.push(id);
        retryPending = true;
        return Promise.resolve();
      },
    };
    const storage = {
      prepare: () =>
        Promise.resolve({ storageKey: newImage.storageKey, stagingKey: '.staging/new.tmp' }),
      promote: () => Promise.resolve(),
      discard: (key: string) => {
        discarded.push(key);
        if (key === oldKey && oldDiscardAttempts++ === 0) {
          return Promise.reject(new ProductImageError('PRODUCT_IMAGE_STORAGE_UNAVAILABLE'));
        }
        return Promise.resolve();
      },
    };
    const images = service(repository, storage);

    const result = await images.replace(imageId, input);
    assert.equal(result.imageVersion, 2);
    assert.deepEqual(failedCleanup, [cleanupId]);
    assert.deepEqual(deletedCleanup, []);

    repository.transaction = () => Promise.reject(new Error('stop after cleanup retry'));
    await assert.rejects(() => images.upload(productId, input), /stop after cleanup retry/u);
    assert.deepEqual(deletedCleanup, [cleanupId]);
    assert.deepEqual(
      discarded.filter((key) => key === oldKey),
      [oldKey, oldKey],
    );
  });
});
