import assert from 'node:assert/strict';
import test from 'node:test';
import { AdminHttpError } from '../app/http/http-client';
import {
  categoryNameError,
  categoryOptions,
  findCategory,
  normalizeCategoryName,
  reconcileCreatedCategory,
  reconcileDeletedCategory,
  reconcileUpdatedCategory,
} from '../app/catalog/categories/category-model';
import { categoryFailurePresentation } from '../app/catalog/categories/category-failures';
import type { CategoryDto } from '../app/catalog/catalog-contracts';

const CHILD_ID = '22222222-2222-4222-8222-222222222222';
const ROOT_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '33333333-3333-4333-8333-333333333333';
const time = '2026-09-04T10:00:00.000Z';
const tree: readonly CategoryDto[] = [
  {
    id: ROOT_ID,
    name: 'پوشاک',
    parentId: null,
    level: 1,
    createdAt: time,
    updatedAt: time,
    children: [
      {
        id: CHILD_ID,
        name: 'زنانه',
        parentId: ROOT_ID,
        level: 2,
        createdAt: time,
        updatedAt: time,
        children: [],
      },
    ],
  },
  {
    id: OTHER_ID,
    name: 'اکسسوری',
    parentId: null,
    level: 1,
    createdAt: time,
    updatedAt: time,
    children: [],
  },
];

void test('normalizes Category names with Backend-compatible bounds', () => {
  assert.equal(normalizeCategoryName('  پوشاک\t زنانه  '), 'پوشاک زنانه');
  assert.equal(categoryNameError('   '), 'نام دسته‌بندی الزامی است.');
  assert.match(categoryNameError('الف'.repeat(121)) ?? '', /۱۲۰/u);
  assert.equal(categoryNameError('پوشاک زنانه'), undefined);
});

void test('excludes an edited Category and every visible descendant from parent choices', () => {
  const options = categoryOptions(tree, ROOT_ID);
  assert.deepEqual(
    options.map(({ value }) => value),
    [null, OTHER_ID],
  );
  assert.equal(findCategory(tree, CHILD_ID)?.name, 'زنانه');
});

void test('reconciles only authoritative mutation fields before the complete tree refetch', () => {
  const created: CategoryDto = {
    ...tree[1]!,
    id: '44444444-4444-4444-8444-444444444444',
    name: 'کیف',
    parentId: ROOT_ID,
    level: 2,
  };
  const afterCreate = reconcileCreatedCategory(tree, created);
  assert.equal(findCategory(afterCreate, created.id)?.name, 'کیف');

  const moved = { ...tree[1]!, name: 'زیورآلات', parentId: ROOT_ID, level: 2 };
  const afterUpdate = reconcileUpdatedCategory(afterCreate, moved);
  assert.equal(findCategory(afterUpdate, OTHER_ID)?.name, 'زیورآلات');
  assert.equal(findCategory(afterUpdate, OTHER_ID)?.parentId, null);

  const afterDelete = reconcileDeletedCategory(afterUpdate, CHILD_ID);
  assert.equal(findCategory(afterDelete, CHILD_ID), undefined);
});

void test('maps every Category conflict, validation, permission, CSRF, and transport family safely', () => {
  const cases = [
    ['CATEGORY_NAME_CONFLICT', 'name'],
    ['CATEGORY_MOVE_INVALID', 'parentId'],
    ['CATEGORY_LIMIT_REACHED', undefined],
    ['CATEGORY_NOT_EMPTY', undefined],
    ['CATEGORY_NOT_FOUND', undefined],
    ['VALIDATION_FAILED', undefined],
    ['INSUFFICIENT_PERMISSION', undefined],
    ['CSRF_VALIDATION_FAILED', undefined],
  ] as const;
  for (const [code, field] of cases) {
    const status = code === 'VALIDATION_FAILED' ? 400 : code.endsWith('_NOT_FOUND') ? 404 : 409;
    const result = categoryFailurePresentation(new AdminHttpError('http', status, code));
    assert.equal(result.code, code);
    assert.equal(result.field, field);
    assert.equal(result.message.includes(code), false);
  }
  const connectivity = categoryFailurePresentation(
    new AdminHttpError('network', null, 'NETWORK_ERROR'),
  );
  assert.match(connectivity.message, /ارتباط/u);
  assert.equal(connectivity.message.includes('NETWORK_ERROR'), false);

  const validation = categoryFailurePresentation(
    new AdminHttpError('http', 400, 'VALIDATION_FAILED', null, ['parentId', 'internal']),
  );
  assert.equal(validation.field, 'parentId');
  assert.equal(validation.refreshTree, false);
});
