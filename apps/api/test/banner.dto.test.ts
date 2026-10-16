import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  parseBannerId,
  parseCreateBannerRequest,
  parseUpdateBannerRequest,
} from '../src/catalog/banner.dto.js';
import { BannerError } from '../src/catalog/banner.errors.js';

const file = { fieldname: 'file', mimetype: 'image/png', size: 12, buffer: Buffer.alloc(12) };

void describe('Banner request validation', () => {
  void test('accepts canonical create, metadata-only update, image-only update, and UUID', () => {
    assert.deepEqual(parseCreateBannerRequest([file], { alt: '  فروش ویژه  ' }), {
      file,
      alt: 'فروش ویژه',
    });
    assert.deepEqual(parseUpdateBannerRequest(undefined, { alt: '' }), { alt: null });
    assert.deepEqual(parseUpdateBannerRequest([file], {}), { file });
    assert.equal(
      parseBannerId('10000000-0000-4000-8000-000000000001'),
      '10000000-0000-4000-8000-000000000001',
    );
  });

  void test('rejects missing, duplicate, unknown-field and non-canonical input', () => {
    const cases = [
      () => parseCreateBannerRequest(undefined, {}),
      () => parseCreateBannerRequest([file, file], {}),
      () => parseCreateBannerRequest([file], { extra: true }),
      () => parseCreateBannerRequest([file], { alt: 'x'.repeat(161) }),
      () => parseUpdateBannerRequest(undefined, {}),
      () => parseUpdateBannerRequest(undefined, { alt: 42 }),
      () => parseBannerId('not-a-uuid'),
    ];

    for (const execute of cases) {
      assert.throws(execute, (error: unknown) => error instanceof BannerError);
    }
  });
});
