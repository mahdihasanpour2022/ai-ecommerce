import assert from 'node:assert/strict';
import test from 'node:test';
import { loginDestination, safeReturnDestination } from '../app/auth/return-destination';

void test('accepts only the allowlisted protected home', () => {
  assert.equal(safeReturnDestination('/'), '/');
  assert.equal(loginDestination('/'), '/login?returnTo=%2F');
});

void test('rejects external, protocol-relative, unknown, backslash, and control destinations', () => {
  for (const value of [
    'https://attacker.example',
    '//attacker.example',
    '%2F%2Fattacker.example',
    '/unknown',
    '/\\attacker',
    '/\nadmin',
    'javascript:alert(1)',
    '',
  ]) {
    assert.equal(safeReturnDestination(value), '/', value);
  }
});
