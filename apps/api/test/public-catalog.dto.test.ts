import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { describe, test } from 'node:test';

import { ProductError } from '../src/catalog/product.errors.js';
import { parsePublicProductListQuery } from '../src/catalog/public-catalog.dto.js';
import { publicCategoryTree } from '../src/catalog/public-catalog.service.js';

function rejectsValidation(work: () => unknown): void {
  assert.throws(work, (error: unknown) => {
    assert.ok(error instanceof ProductError);
    assert.equal(error.code, 'VALIDATION_FAILED');
    return true;
  });
}

void describe('public catalog contract parsing and projection', () => {
  void test('applies exact public page defaults and accepted bounds', () => {
    const categoryId = randomUUID();
    assert.deepEqual(parsePublicProductListQuery({}), { page: 1, pageSize: 24 });
    assert.deepEqual(parsePublicProductListQuery({ page: '2', pageSize: '60', categoryId }), {
      page: 2,
      pageSize: 60,
      categoryId,
    });
  });

  void test('rejects unknown, malformed, non-canonical, and unsafe query values', () => {
    for (const query of [
      null,
      [],
      { status: 'ACTIVE' },
      { page: 1 },
      { page: '0' },
      { page: '01' },
      { pageSize: '61' },
      { categoryId: 'not-a-uuid' },
      { page: '2147483648', pageSize: '2' },
    ]) {
      rejectsValidation(() => parsePublicProductListQuery(query));
    }
  });

  void test('projects deterministic nested public Categories without internal fields', () => {
    const rootId = randomUUID();
    const childId = randomUUID();
    const rootImageId = randomUUID();
    assert.deepEqual(
      publicCategoryTree([
        { id: rootId, name: 'Apparel', parentId: null, image: { id: rootImageId } },
        { id: childId, name: 'Shirts', parentId: rootId, image: null },
      ]),
      [
        {
          id: rootId,
          name: 'Apparel',
          src: `/api/v1/catalog/category-images/${rootImageId}/content`,
          children: [{ id: childId, name: 'Shirts', src: null, children: [] }],
        },
      ],
    );
  });
});
