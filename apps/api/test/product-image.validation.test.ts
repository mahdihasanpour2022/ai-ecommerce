import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import sharp from 'sharp';

import type { ProductImageUploadFile } from '../src/catalog/product-image.dto.js';
import { ProductImageError } from '../src/catalog/product-image.errors.js';
import { ProductImageValidator } from '../src/catalog/product-image.validation.js';

const validator = new ProductImageValidator();

function upload(bytes: Buffer, mimetype: string): ProductImageUploadFile {
  return { fieldname: 'file', mimetype, size: bytes.length, buffer: bytes };
}

async function rejectsCode(
  work: () => Promise<unknown>,
  code: ProductImageError['code'],
): Promise<void> {
  await assert.rejects(work, (error: unknown) => {
    assert.ok(error instanceof ProductImageError);
    assert.equal(error.code, code);
    return true;
  });
}

void describe('Product Image content validation', () => {
  void test('fully decodes and classifies static PNG, JPEG, and WebP bytes', async () => {
    for (const fixture of [
      { format: 'png' as const, mimetype: 'image/png', mediaType: 'PNG', extension: 'png' },
      { format: 'jpeg' as const, mimetype: 'image/jpeg', mediaType: 'JPEG', extension: 'jpg' },
      { format: 'webp' as const, mimetype: 'image/webp', mediaType: 'WEBP', extension: 'webp' },
    ]) {
      const bytes = await sharp({
        create: { width: 3, height: 2, channels: 3, background: '#336699' },
      })
        .toFormat(fixture.format)
        .toBuffer();
      const result = await validator.validate(upload(bytes, fixture.mimetype));
      assert.equal(result.mediaType, fixture.mediaType);
      assert.equal(result.extension, fixture.extension);
      assert.equal(result.width, 3);
      assert.equal(result.height, 2);
      assert.equal(result.byteSize, bytes.length);
      assert.strictEqual(result.bytes, bytes);
    }
  });

  void test('rejects unsupported declarations, type mismatch, SVG, and inconsistent length', async () => {
    const png = await sharp({
      create: { width: 1, height: 1, channels: 3, background: '#000000' },
    })
      .png()
      .toBuffer();
    await rejectsCode(
      () => validator.validate(upload(png, 'image/gif')),
      'PRODUCT_IMAGE_TYPE_UNSUPPORTED',
    );
    await rejectsCode(
      () => validator.validate(upload(png, 'image/jpeg')),
      'PRODUCT_IMAGE_TYPE_UNSUPPORTED',
    );
    await rejectsCode(
      () => validator.validate(upload(Buffer.from('<svg></svg>'), 'image/png')),
      'PRODUCT_IMAGE_TYPE_UNSUPPORTED',
    );
    await rejectsCode(
      () => validator.validate({ ...upload(png, 'image/png'), size: png.length + 1 }),
      'PRODUCT_IMAGE_CONTENT_INVALID',
    );
  });

  void test('rejects empty, oversized, truncated, trailing, and animated containers', async () => {
    await rejectsCode(
      () => validator.validate(upload(Buffer.alloc(0), 'image/png')),
      'PRODUCT_IMAGE_CONTENT_INVALID',
    );
    await rejectsCode(
      () => validator.validate(upload(Buffer.alloc(409_600), 'image/png')),
      'PRODUCT_IMAGE_TOO_LARGE',
    );
    const png = await sharp({
      create: { width: 2, height: 2, channels: 4, background: '#ffffffff' },
    })
      .png()
      .toBuffer();
    await rejectsCode(
      () => validator.validate(upload(png.subarray(0, -4), 'image/png')),
      'PRODUCT_IMAGE_CONTENT_INVALID',
    );
    await rejectsCode(
      () => validator.validate(upload(Buffer.concat([png, Buffer.from('payload')]), 'image/png')),
      'PRODUCT_IMAGE_CONTENT_INVALID',
    );

    const animatedMarker = Buffer.alloc(22);
    animatedMarker.write('RIFF', 0, 'ascii');
    animatedMarker.writeUInt32LE(14, 4);
    animatedMarker.write('WEBP', 8, 'ascii');
    animatedMarker.write('ANIM', 12, 'ascii');
    animatedMarker.writeUInt32LE(2, 16);
    await rejectsCode(
      () => validator.validate(upload(animatedMarker, 'image/webp')),
      'PRODUCT_IMAGE_CONTENT_INVALID',
    );
  });

  void test('rejects excessive dimensions before publication', async () => {
    const tooWide = await sharp({
      create: { width: 8193, height: 1, channels: 3, background: '#ffffff' },
    })
      .png()
      .toBuffer();
    await rejectsCode(
      () => validator.validate(upload(tooWide, 'image/png')),
      'PRODUCT_IMAGE_DIMENSIONS_INVALID',
    );
  });
});
