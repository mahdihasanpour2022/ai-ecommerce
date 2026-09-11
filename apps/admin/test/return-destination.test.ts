import assert from 'node:assert/strict';
import test from 'node:test';
import { loginDestination, safeReturnDestination } from '../app/auth/return-destination';

void test('accepts allowlisted protected Admin destinations', () => {
  assert.equal(safeReturnDestination('/'), '/');
  assert.equal(safeReturnDestination('/categories'), '/categories');
  assert.equal(loginDestination('/'), '/login?returnTo=%2F');
  assert.equal(loginDestination('/categories'), '/login?returnTo=%2Fcategories');
});

void test('rejects external, protocol-relative, unknown, backslash, and control destinations', () => {
  for (const value of [
    'https://attacker.example',
    '//attacker.example',
    '%2F%2Fattacker.example',
    '/unknown',
    '/catalog/products',
    '/catalog/categories',
    '/\\attacker',
    '/\nadmin',
    'javascript:alert(1)',
    '',
  ]) {
    assert.equal(safeReturnDestination(value), '/', value);
  }
});
