import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';

const apiRoot = process.cwd();
const schema = readFileSync(resolve(apiRoot, 'prisma/schema.prisma'), 'utf8');
const adminMigration = readFileSync(
  resolve(
    apiRoot,
    'prisma/migrations/20260828000000_add_admin_identity_and_sessions/migration.sql',
  ),
  'utf8',
);
const catalogMigration = readFileSync(
  resolve(
    apiRoot,
    'prisma/migrations/20260903200725_add_clothing_catalog_foundation/migration.sql',
  ),
  'utf8',
);
const usernameMigration = readFileSync(
  resolve(apiRoot, 'prisma/migrations/20260905120000_add_admin_username/migration.sql'),
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
  'Category',
  'Product',
  'ProductVariant',
  'Inventory',
  'ProductImage',
  'ProductImageCleanup',
  'PriceDisplaySetting',
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

const approvedCatalogTables = [
  'categories',
  'products',
  'product_variants',
  'inventories',
  'product_images',
  'product_image_cleanups',
  'price_display_settings',
];

void describe('Prisma schema and reviewed migrations', () => {
  void test('contains exactly the approved Admin and catalog Prisma models', () => {
    const actualModels = [...schema.matchAll(/^model\s+(\w+)\s+\{/gm)].map((match) => match[1]);

    assert.deepEqual(actualModels.sort(), [...approvedModels].sort());
  });

  void test('creates only the nine approved application tables additively', () => {
    const actualTables = [...adminMigration.matchAll(/^CREATE TABLE "([^"]+)"/gm)].map(
      (match) => match[1],
    );

    assert.deepEqual(actualTables.sort(), [...approvedTables].sort());
    assert.match(adminMigration, /^BEGIN;/);
    assert.match(adminMigration, /COMMIT;\s*$/);
    assert.doesNotMatch(adminMigration, /\b(?:DROP|TRUNCATE)\b/i);
    assert.doesNotMatch(adminMigration, /ALTER\s+(?:COLUMN|TYPE)\b/i);
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
      assert.match(adminMigration, new RegExp(`"${databaseObject}"`));
    }

    assert.match(adminMigration, /WHERE "rotated_at" IS NULL AND "revoked_at" IS NULL;/);
    assert.match(adminMigration, /FOREIGN KEY \("replaced_by_token_id", "session_id"\)/);
    assert.match(adminMigration, /octet_length\("recovery_nonce"\) = 12/);
    assert.match(adminMigration, /octet_length\("recovery_auth_tag"\) = 16/);
  });

  void test('adds a required canonical unique Admin username with safe legacy backfill', () => {
    assert.match(schema, /username\s+String\s+@unique\(map: "admin_users_username_key"\)/u);
    assert.match(usernameMigration, /^BEGIN;/u);
    assert.match(usernameMigration, /ADD COLUMN "username" VARCHAR\(20\)/u);
    assert.match(usernameMigration, /'legacy_' \|\| left\(replace\("id"::text/u);
    assert.match(usernameMigration, /ALTER COLUMN "username" SET NOT NULL/u);
    assert.match(usernameMigration, /\^\[a-z0-9_\]\{3,20\}\$/u);
    assert.match(usernameMigration, /"admin_users_username_key"/u);
    assert.match(usernameMigration, /COMMIT;\s*$/u);
    assert.doesNotMatch(usernameMigration, /\b(?:DROP|TRUNCATE)\b/iu);
  });

  void test('inserts only the approved Sprint 1 RBAC reference grant', () => {
    assert.match(adminMigration, /'SUPER_ADMIN'/);
    assert.match(adminMigration, /'admin\.access'/);
    assert.equal((adminMigration.match(/INSERT INTO "roles"/g) ?? []).length, 1);
    assert.equal((adminMigration.match(/INSERT INTO "permissions"/g) ?? []).length, 1);
    assert.equal((adminMigration.match(/INSERT INTO "role_permissions"/g) ?? []).length, 1);
  });

  void test('creates exactly the seven approved catalog tables additively', () => {
    const actualTables = [...catalogMigration.matchAll(/^CREATE TABLE "([^"]+)"/gm)].map(
      (match) => match[1],
    );

    assert.deepEqual(actualTables.sort(), [...approvedCatalogTables].sort());
    assert.match(catalogMigration, /^BEGIN;/);
    assert.match(catalogMigration, /COMMIT;\s*$/);
    assert.doesNotMatch(catalogMigration, /\b(?:DROP|TRUNCATE)\b/i);
    assert.doesNotMatch(catalogMigration, /permissions_code_format_check/);
  });

  void test('keeps catalog PostgreSQL invariants in reviewed SQL', () => {
    const requiredDatabaseObjects = [
      'categories_parent_id_name_key_key',
      'product_variants_product_size_color_key',
      'product_images_product_id_position_key',
      'categories_tree_guard',
      'products_integrity_check',
      'inventories_version_guard',
      'product_images_order_check',
      'price_display_settings_singleton_guard',
    ];

    for (const databaseObject of requiredDatabaseObjects) {
      assert.match(catalogMigration, new RegExp(`"${databaseObject}"`));
    }

    assert.equal((catalogMigration.match(/NULLS NOT DISTINCT/g) ?? []).length, 2);
    assert.match(catalogMigration, /DEFERRABLE INITIALLY IMMEDIATE/);
    assert.match(catalogMigration, /DEFERRABLE INITIALLY DEFERRED/);
    assert.match(catalogMigration, /pg_advisory_xact_lock\(1120002, 1\)/);
  });

  void test('registers only convention-compatible catalog permission codes', () => {
    const permissionCodes = [
      'catalog.read',
      'catalog.manage',
      'inventory.update',
      'product.media.manage',
      'settings.price.display.unit.update',
    ];

    for (const permissionCode of permissionCodes) {
      assert.match(catalogMigration, new RegExp(`'${permissionCode.replaceAll('.', '\\.')}'`));
    }
    assert.doesNotMatch(catalogMigration, /'product-media\.manage'/);
    assert.doesNotMatch(catalogMigration, /'settings\.price-display-unit\.update'/);
  });
});
