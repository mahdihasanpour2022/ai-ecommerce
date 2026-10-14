import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { parseBannerId, parseBannerImage } from '../src/catalog/banner.dto.js';
import { BannerError } from '../src/catalog/banner.errors.js';

const file = { fieldname: 'file', mimetype: 'image/png', size: 12, buffer: Buffer.alloc(12) };

void describe('Banner request validation', () => {
  void test('accepts one canonical file and UUID', () => {
    assert.deepEqual(parseBannerImage([file], {}), { file });
    assert.equal(
      parseBannerId('10000000-0000-4000-8000-000000000001'),
      '10000000-0000-4000-8000-000000000001',
    );
  });

  void test('rejects missing, duplicate, unknown-field and non-canonical input', () => {
    const cases = [
      () => parseBannerImage(undefined, {}),
      () => parseBannerImage([file, file], {}),
      () => parseBannerImage([file], { extra: true }),
      () => parseBannerId('not-a-uuid'),
    ];

    for (const execute of cases) {
      assert.throws(execute, (error: unknown) => error instanceof BannerError);
    }
  });
});
