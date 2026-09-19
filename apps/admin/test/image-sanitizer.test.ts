import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  imageSanitizer,
  PRODUCT_IMAGE_MAX_BYTES,
  ProductImageSanitizationError,
} from '../features/products/utils/image-sanitizer';

function pngFile(name = 'product.png', type = 'image/png'): File {
  return new File(
    [
      new Uint8Array([
        137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
      ]),
    ],
    name,
    { type },
  );
}

void test('accepts an allowlisted image container below the Backend limit', async () => {
  const file = pngFile();
  assert.equal(await imageSanitizer(file), file);
});

void test('rejects unsupported, mismatched, trailing-payload, and oversized files', async () => {
  const cases = [
    new File(['<svg></svg>'], 'attack.svg', { type: 'image/svg+xml' }),
    pngFile('product.jpg', 'image/jpeg'),
    new File(
      [
        new Uint8Array([
          137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130, 60, 115,
          99, 114, 105, 112, 116, 62,
        ]),
      ],
      'trailing.png',
      { type: 'image/png' },
    ),
    new File([new Uint8Array(PRODUCT_IMAGE_MAX_BYTES)], 'large.png', { type: 'image/png' }),
  ];

  for (const file of cases) {
    await assert.rejects(() => imageSanitizer(file), ProductImageSanitizationError);
  }
});
