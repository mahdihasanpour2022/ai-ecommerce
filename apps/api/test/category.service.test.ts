import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  normalizeCategoryName,
  parseCreateCategoryRequest,
  parseUpdateCategoryRequest,
} from '../src/catalog/category.dto.js';
import { CategoryError } from '../src/catalog/category.errors.js';
import { buildCategoryTree } from '../src/catalog/category.service.js';
import type { CategoryRecord } from '../src/catalog/category.repository.js';

const now = new Date('2026-09-04T00:00:00.000Z');
const file = { fieldname: 'file', mimetype: 'image/png', size: 12, buffer: Buffer.alloc(12) };

function row(id: string, name: string, nameKey: string, parentId: string | null): CategoryRecord {
  return { id, name, nameKey, parentId, image: null, createdAt: now, updatedAt: now };
}

void describe('Category validation and tree projection', () => {
  void test('normalizes display whitespace and a deterministic comparison key', () => {
    assert.deepEqual(normalizeCategoryName('  Ｔｅｓｔ   CATEGORY  '), {
      name: 'Test CATEGORY',
      nameKey: 'test category',
    });
    assert.deepEqual(parseCreateCategoryRequest({ name: '  پوشاک   زنانه  ' }, [file]), {
      name: 'پوشاک زنانه',
      nameKey: 'پوشاک زنانه',
      parentId: null,
      file,
    });
  });

  void test('rejects unknown fields, empty patches, and non-canonical identifiers', () => {
    for (const input of [null, {}, { name: 'Valid', extra: true }]) {
      assert.throws(
        () => parseCreateCategoryRequest(input, [file]),
        (error: unknown) => error instanceof CategoryError && error.code === 'VALIDATION_FAILED',
      );
    }
    assert.throws(
      () => parseUpdateCategoryRequest({}, undefined),
      (error: unknown) => error instanceof CategoryError && error.code === 'VALIDATION_FAILED',
    );
    assert.throws(
      () => parseUpdateCategoryRequest({ parentId: 'NOT-A-UUID' }, undefined),
      (error: unknown) => error instanceof CategoryError && error.code === 'VALIDATION_FAILED',
    );
  });

  void test('builds a deterministic nested DTO without exposing name keys', () => {
    const rootId = '10000000-0000-4000-8000-000000000001';
    const childId = '10000000-0000-4000-8000-000000000002';
    const tree = buildCategoryTree([
      row(childId, 'Child', 'child', rootId),
      row(rootId, 'Root', 'root', null),
    ]);

    assert.equal(tree.length, 1);
    assert.equal(tree[0]?.level, 1);
    assert.equal(tree[0]?.children[0]?.level, 2);
    assert.equal(JSON.stringify(tree).includes('nameKey'), false);
  });
});
