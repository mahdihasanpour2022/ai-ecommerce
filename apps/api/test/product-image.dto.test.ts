import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { describe, test } from 'node:test';

import {
  parseProductImageOrder,
  parseProductImageUpload,
  parseProductImageVersionQuery,
  type ProductImageUploadFile,
} from '../src/catalog/product-image.dto.js';
import { ProductImageError } from '../src/catalog/product-image.errors.js';

const file: ProductImageUploadFile = {
  fieldname: 'file',
  mimetype: 'image/png',
  size: 1,
  buffer: Buffer.from([1]),
};

function rejectsValidation(work: () => unknown): void {
  assert.throws(work, (error: unknown) => {
    assert.ok(error instanceof ProductImageError);
    assert.equal(error.code, 'VALIDATION_FAILED');
    return true;
  });
}

void describe('Product Image request parsing', () => {
  void test('accepts only one canonical multipart version and one file field', () => {
    assert.deepEqual(parseProductImageUpload([file], { imageVersion: '12' }), {
      file,
      imageVersion: 12,
    });

    for (const candidate of [
      [undefined, { imageVersion: '1' }],
      [[], { imageVersion: '1' }],
      [[file, file], { imageVersion: '1' }],
      [[{ ...file, fieldname: 'avatar' }], { imageVersion: '1' }],
      [[file], { imageVersion: '01' }],
      [[file], { imageVersion: '0' }],
      [[file], { imageVersion: '2147483648' }],
      [[file], { imageVersion: '1', extra: 'x' }],
    ] as const) {
      rejectsValidation(() => parseProductImageUpload(candidate[0], candidate[1]));
    }
  });

  void test('strictly parses complete order bodies while leaving membership to the service', () => {
    const first = randomUUID();
    const second = randomUUID();
    assert.deepEqual(parseProductImageOrder({ imageIds: [first, second], imageVersion: 4 }), {
      imageIds: [first, second],
      imageVersion: 4,
    });
    assert.deepEqual(parseProductImageOrder({ imageIds: [first, first], imageVersion: 4 }), {
      imageIds: [first, first],
      imageVersion: 4,
    });

    for (const body of [
      null,
      { imageIds: [first], imageVersion: '4' },
      { imageIds: ['not-a-uuid'], imageVersion: 4 },
      { imageIds: [first], imageVersion: 0 },
      { imageIds: [first], imageVersion: 4, extra: true },
    ]) {
      rejectsValidation(() => parseProductImageOrder(body));
    }
  });

  void test('requires an exact canonical version query', () => {
    assert.equal(parseProductImageVersionQuery({ imageVersion: '7' }), 7);
    for (const query of [
      {},
      { imageVersion: 7 },
      { imageVersion: '+7' },
      { imageVersion: '07' },
      { imageVersion: '7', other: 'x' },
    ]) {
      rejectsValidation(() => parseProductImageVersionQuery(query));
    }
  });
});
