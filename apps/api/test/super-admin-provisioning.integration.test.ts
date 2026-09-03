import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { after, before, beforeEach, describe, test } from 'node:test';

import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';

import {
  ADMIN_ACCESS_PERMISSION_CODE,
  provisionFirstSuperAdmin,
  ProvisioningError,
  SUPER_ADMIN_ROLE_CODE,
  type SuperAdminInput,
} from '../src/administration/super-admin-provisioning.js';
import { PrismaClient } from '../src/generated/prisma/client.js';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const SYSTEM_ROLE_ID = '00000000-0000-4000-8000-000000000001';
const SYSTEM_PERMISSION_ID = '00000000-0000-4000-8000-000000000002';
const EXPECTED_SYSTEM_PERMISSION_CODES = [
  ADMIN_ACCESS_PERMISSION_CODE,
  'catalog.manage',
  'catalog.read',
  'inventory.update',
  'product.media.manage',
  'settings.price.display.unit.update',
];

function createInput(sequence: number): SuperAdminInput {
  return {
    email: `provisioning-${sequence}@example.invalid`,
    displayName: `Provisioning Admin ${sequence}`,
    password: randomBytes(32).toString('base64url'),
  };
}

void describe(
  'first Super Admin PostgreSQL provisioning invariants',
  { skip: testDatabaseUrl === undefined, concurrency: 1 },
  () => {
    let prisma: PrismaClient;

    async function ensureReferenceState(): Promise<void> {
      const role = await prisma.role.upsert({
        where: { code: SUPER_ADMIN_ROLE_CODE },
        update: {},
        create: { id: SYSTEM_ROLE_ID, code: SUPER_ADMIN_ROLE_CODE },
      });
      const permission = await prisma.permission.upsert({
        where: { code: ADMIN_ACCESS_PERMISSION_CODE },
        update: {},
        create: { id: SYSTEM_PERMISSION_ID, code: ADMIN_ACCESS_PERMISSION_CODE },
      });

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId: permission.id },
        },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }

    void before(async () => {
      assert.ok(testDatabaseUrl);
      prisma = new PrismaClient({
        adapter: new PrismaPg({ connectionString: testDatabaseUrl }),
      });
      await prisma.$connect();
    });

    void beforeEach(async () => {
      await prisma.adminUser.deleteMany();
      await ensureReferenceState();
    });

    void after(async () => {
      await prisma.$disconnect();
    });

    void test('creates exactly one eligible Admin with a verifiable hash and no session', async () => {
      const input = createInput(1);
      await provisionFirstSuperAdmin(prisma, input);

      const admin = await prisma.adminUser.findUniqueOrThrow({
        where: { email: input.email },
        include: {
          roles: {
            include: {
              role: {
                include: {
                  permissions: { include: { permission: true } },
                },
              },
            },
          },
        },
      });

      assert.equal(admin.displayName, input.displayName);
      const [, algorithm, version, parameters] = admin.passwordHash.split('$');
      assert.equal(algorithm, 'argon2id');
      assert.equal(version, 'v=19');
      assert.deepEqual(parameters?.split(',').sort(), ['m=65536', 'p=1', 't=3']);
      assert.equal(await argon2.verify(admin.passwordHash, input.password), true);
      assert.deepEqual(
        admin.roles.map(({ role }) => role.code),
        [SUPER_ADMIN_ROLE_CODE],
      );
      assert.deepEqual(
        admin.roles
          .flatMap(({ role }) => role.permissions.map(({ permission }) => permission.code))
          .sort(),
        [...EXPECTED_SYSTEM_PERMISSION_CODES].sort(),
      );
      assert.equal(await prisma.authSession.count(), 0);
      assert.equal(await prisma.refreshToken.count(), 0);
    });

    void test('fails a repeat attempt without creating another Admin', async () => {
      await provisionFirstSuperAdmin(prisma, createInput(2));

      await assert.rejects(
        provisionFirstSuperAdmin(prisma, createInput(3)),
        (error: unknown) =>
          error instanceof ProvisioningError && error.code === 'ALREADY_PROVISIONED',
      );
      assert.equal(await prisma.adminUser.count(), 1);
      assert.equal(await prisma.adminUserRole.count(), 1);
    });

    void test('allows exactly one of two concurrent initial attempts to succeed', async () => {
      const outcomes = await Promise.allSettled([
        provisionFirstSuperAdmin(prisma, createInput(4)),
        provisionFirstSuperAdmin(prisma, createInput(5)),
      ]);

      assert.equal(outcomes.filter(({ status }) => status === 'fulfilled').length, 1);
      const rejection = outcomes.find(({ status }) => status === 'rejected');
      assert.ok(rejection && rejection.status === 'rejected');
      assert.ok(
        rejection.reason instanceof ProvisioningError &&
          rejection.reason.code === 'ALREADY_PROVISIONED',
      );
      assert.equal(await prisma.adminUser.count(), 1);
      assert.equal(await prisma.adminUserRole.count(), 1);
    });

    void test('fails closed when the required permission grant is missing', async () => {
      await prisma.rolePermission.delete({
        where: {
          roleId_permissionId: {
            roleId: SYSTEM_ROLE_ID,
            permissionId: SYSTEM_PERMISSION_ID,
          },
        },
      });

      try {
        await assert.rejects(
          provisionFirstSuperAdmin(prisma, createInput(6)),
          (error: unknown) =>
            error instanceof ProvisioningError && error.code === 'REFERENCE_DATA_INVALID',
        );
        assert.equal(await prisma.adminUser.count(), 0);
      } finally {
        await ensureReferenceState();
      }
    });

    void test('rolls back the Admin if assignment insertion fails', async () => {
      await prisma.$executeRawUnsafe(`
        CREATE FUNCTION public.test_reject_admin_role_assignment()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        BEGIN
          RAISE EXCEPTION 'test assignment rejection';
        END;
        $$
      `);
      await prisma.$executeRawUnsafe(`
        CREATE TRIGGER test_reject_admin_role_assignment
        BEFORE INSERT ON public.admin_user_roles
        FOR EACH ROW
        EXECUTE FUNCTION public.test_reject_admin_role_assignment()
      `);

      try {
        await assert.rejects(
          provisionFirstSuperAdmin(prisma, createInput(7)),
          /test assignment rejection/u,
        );
        assert.equal(await prisma.adminUser.count(), 0);
        assert.equal(await prisma.adminUserRole.count(), 0);
      } finally {
        await prisma.$executeRawUnsafe(`
          DROP TRIGGER IF EXISTS test_reject_admin_role_assignment
            ON public.admin_user_roles
        `);
        await prisma.$executeRawUnsafe(
          'DROP FUNCTION IF EXISTS public.test_reject_admin_role_assignment()',
        );
      }
    });
  },
);
