import assert from 'node:assert/strict';
import test from 'node:test';
import {
  decodeAuthenticationHeader,
  encodeAuthenticationHeader,
} from '../app/auth/server-auth-header';
import { parseCurrentAuthentication } from '../app/auth/session-contract';

const current = {
  admin: { id: 'admin-1', email: 'admin@example.com', displayName: 'مدیر آزمون' },
  authorization: { roles: ['SUPER_ADMIN'], permissions: ['admin.access'] },
};

void test('round-trips only the safe current authentication snapshot', () => {
  assert.deepEqual(parseCurrentAuthentication({ ...current, csrfToken: 'not-copied' }), current);
  assert.deepEqual(decodeAuthenticationHeader(encodeAuthenticationHeader(current)), current);
});

void test('rejects malformed or oversized server authentication state', () => {
  assert.equal(parseCurrentAuthentication({ admin: {}, authorization: {} }), null);
  assert.equal(decodeAuthenticationHeader('not+base64url'), null);
  assert.equal(decodeAuthenticationHeader('a'.repeat(16_385)), null);
});
