import assert from 'node:assert/strict';
import test from 'node:test';
import { loginDestination, safeReturnDestination } from '../app/auth/return-destination';

const PRODUCT_ID = '123e4567-e89b-42d3-a456-426614174000';

void test('accepts the protected home and canonical catalog destinations', () => {
  assert.equal(safeReturnDestination('/'), '/');
  assert.equal(loginDestination('/'), '/login?returnTo=%2F');
  assert.equal(safeReturnDestination('/catalog/categories'), '/catalog/categories');
  assert.equal(
    safeReturnDestination(`/catalog/products/${PRODUCT_ID}?section=inventory`),
    `/catalog/products/${PRODUCT_ID}?section=inventory`,
  );
  assert.equal(
    safeReturnDestination(
      `/catalog/products?page=2&pageSize=50&categoryId=${PRODUCT_ID}&status=DRAFT`,
    ),
    `/catalog/products?page=2&pageSize=50&categoryId=${PRODUCT_ID}&status=DRAFT`,
  );
});

void test('rejects external, protocol-relative, unknown, backslash, and control destinations', () => {
  for (const value of [
    'https://attacker.example',
    '//attacker.example',
    '%2F%2Fattacker.example',
    '/unknown',
    '/catalog/products?page=0',
    '/catalog/products?pageSize=10',
    '/catalog/products?status=PUBLIC',
    '/catalog/products?page=1&page=2',
    `/catalog/products/${PRODUCT_ID}?section=unknown`,
    '/catalog/products/not-a-uuid',
    '/\\attacker',
    '/\nadmin',
    'javascript:alert(1)',
    '',
  ]) {
    assert.equal(safeReturnDestination(value), '/', value);
  }
});
