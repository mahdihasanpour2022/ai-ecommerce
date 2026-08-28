import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

const apiRoot = process.cwd();
const schema = readFileSync(resolve(apiRoot, 'prisma/schema.prisma'), 'utf8');
const migration = readFileSync(
  resolve(
    apiRoot,
    'prisma/migrations/20260828000000_add_admin_identity_and_sessions/migration.sql',
  ),
  'utf8',
);

const approvedModels = [
  'AdminUser',
  'Role',
  'Permission',
  'AdminUserRole',
  'RolePermission',
  'AuthSession',
  'RefreshToken',
  'AdminLoginThrottle',
  'AuthSessionRefreshThrottle',
];

const approvedTables = [
  'admin_users',
  'roles',
  'permissions',
  'admin_user_roles',
  'role_permissions',
  'auth_sessions',
  'refresh_tokens',
  'admin_login_throttles',
  'auth_session_refresh_throttles',
];

void describe('Admin identity Prisma schema and initial migration', () => {
  void test('contains exactly the nine approved Prisma models', () => {
    const actualModels = [...schema.matchAll(/^model\s+(\w+)\s+\{/gm)].map((match) => match[1]);

    assert.deepEqual(actualModels.sort(), [...approvedModels].sort());
  });

  void test('creates only the nine approved application tables additively', () => {
    const actualTables = [...migration.matchAll(/^CREATE TABLE "([^"]+)"/gm)].map(
      (match) => match[1],
    );

    assert.deepEqual(actualTables.sort(), [...approvedTables].sort());
    assert.match(migration, /^BEGIN;/);
    assert.match(migration, /COMMIT;\s*$/);
    assert.doesNotMatch(migration, /\b(?:DROP|TRUNCATE)\b/i);
    assert.doesNotMatch(migration, /ALTER\s+(?:COLUMN|TYPE)\b/i);
  });

  void test('keeps security-critical native invariants in reviewed SQL', () => {
    const requiredDatabaseObjects = [
      'admin_users_email_canonical_check',
      'auth_sessions_csrf_hash_length_check',
      'refresh_tokens_token_hash_length_check',
      'refresh_tokens_recovery_envelope_check',
      'admin_login_throttles_identifier_key_length_check',
      'refresh_tokens_replacement_fkey',
      'refresh_tokens_one_current_per_session',
    ];

    for (const databaseObject of requiredDatabaseObjects) {
      assert.match(migration, new RegExp(`"${databaseObject}"`));
    }

    assert.match(migration, /WHERE "rotated_at" IS NULL AND "revoked_at" IS NULL;/);
    assert.match(migration, /FOREIGN KEY \("replaced_by_token_id", "session_id"\)/);
    assert.match(migration, /octet_length\("recovery_nonce"\) = 12/);
    assert.match(migration, /octet_length\("recovery_auth_tag"\) = 16/);
  });

  void test('inserts only the approved Sprint 1 RBAC reference grant', () => {
    assert.match(migration, /'SUPER_ADMIN'/);
    assert.match(migration, /'admin\.access'/);
    assert.equal((migration.match(/INSERT INTO "roles"/g) ?? []).length, 1);
    assert.equal((migration.match(/INSERT INTO "permissions"/g) ?? []).length, 1);
    assert.equal((migration.match(/INSERT INTO "role_permissions"/g) ?? []).length, 1);
  });
});
