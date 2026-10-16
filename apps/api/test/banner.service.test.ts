import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { BannerRepository } from '../src/catalog/banner.repository.js';
import { BannerService } from '../src/catalog/banner.service.js';
import type { ProductImageStorage } from '../src/catalog/product-image.storage.js';
import type { ProductImageValidator } from '../src/catalog/product-image.validation.js';

const timestamp = new Date('2026-10-15T08:00:00.000Z');
const row = {
  id: '10000000-0000-4000-8000-000000000001',
  altText: 'فروش ویژه',
  storageKey: 'banners/banner.webp',
  mediaType: 'WEBP' as const,
  byteSize: 1024,
  width: 1440,
  height: 480,
  createdAt: timestamp,
  updatedAt: timestamp,
};

function service(repository: BannerRepository): BannerService {
  return new BannerService(
    repository,
    {} as ProductImageStorage,
    {} as ProductImageValidator,
  );
}

void describe('Banner service presentation metadata', () => {
  void test('returns public src and nullable alt in list responses', async () => {
    const repository = { list: () => Promise.resolve([row]) } as unknown as BannerRepository;

    assert.deepEqual(await service(repository).list(), [
      {
        id: row.id,
        src: `/api/v1/catalog/banners/${row.id}/content`,
        alt: row.altText,
        mediaType: row.mediaType,
        byteSize: row.byteSize,
        width: row.width,
        height: row.height,
        createdAt: timestamp.toISOString(),
        updatedAt: timestamp.toISOString(),
      },
    ]);
  });

  void test('updates alt without replacing or reading image bytes', async () => {
    let updateData: unknown;
    const transaction = {
      banner: {
        findUnique: () => Promise.resolve({ id: row.id }),
        update: ({ data }: { readonly data: unknown }) => {
          updateData = data;
          return Promise.resolve({ ...row, altText: 'عنوان جدید' });
        },
      },
    };
    const repository = {
      pendingCleanups: () => Promise.resolve([]),
      transaction: (work: (value: typeof transaction) => Promise<unknown>) => work(transaction),
    } as unknown as BannerRepository;

    const result = await service(repository).update(row.id, { alt: 'عنوان جدید' });

    assert.deepEqual(updateData, { altText: 'عنوان جدید' });
    assert.equal(result.alt, 'عنوان جدید');
    assert.equal(result.src, `/api/v1/catalog/banners/${row.id}/content`);
  });
});
