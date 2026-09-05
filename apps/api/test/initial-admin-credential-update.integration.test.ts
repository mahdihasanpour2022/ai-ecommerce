import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';

import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';

import {
  CredentialUpdateError,
  updateInitialAdminCredentials,
} from '../src/administration/initial-admin-credential-update.js';
import { PrismaClient } from '../src/generated/prisma/client.js';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

void describe(
  'initial Admin credential update PostgreSQL invariants',
  { skip: testDatabaseUrl === undefined, concurrency: 1 },
  () => {
    let prisma: PrismaClient;

    void before(async () => {
      assert.ok(testDatabaseUrl);
      prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: testDatabaseUrl }) });
      await prisma.$connect();
    });

    void beforeEach(async () => {
      await prisma.authSession.deleteMany();
      await prisma.adminUser.deleteMany();
    });

    void after(async () => {
      await prisma.$disconnect();
    });

    async function createLegacyAdmin() {
      return prisma.adminUser.create({
        data: {
          email: 'initial-admin@example.invalid',
          username: 'legacy_123456789abcd',
          displayName: 'Initial Admin',
          passwordHash: await argon2.hash('456789'),
          sessions: {
            create: {
              csrfTokenHash: Buffer.alloc(32, 1),
              expiresAt: new Date(Date.now() + 60_000),
              refreshThrottle: { create: {} },
              refreshTokens: {
                create: {
                  tokenHash: Buffer.alloc(32, 2),
                  expiresAt: new Date(Date.now() + 60_000),
                  recoveryCiphertext: Buffer.alloc(4, 3),
                  recoveryNonce: Buffer.alloc(12, 4),
                  recoveryAuthTag: Buffer.alloc(16, 5),
                  recoveryKeyId: 'test-key',
                  recoveryExpiresAt: new Date(Date.now() + 30_000),
                },
              },
            },
          },
        },
      });
    }

    void test('atomically replaces the legacy username/hash and revokes existing sessions', async () => {
      const admin = await createLegacyAdmin();
      await updateInitialAdminCredentials(prisma, {
        username: 'updated_admin',
        password: '654321',
      });

      const updated = await prisma.adminUser.findUniqueOrThrow({
        where: { id: admin.id },
        include: { sessions: { include: { refreshTokens: true } } },
      });
      assert.equal(updated.username, 'updated_admin');
      assert.equal(await argon2.verify(updated.passwordHash, '654321'), true);
      assert.ok(updated.sessions[0]?.revokedAt);
      const refresh = updated.sessions[0]?.refreshTokens[0];
      assert.ok(refresh?.revokedAt);
      assert.equal(refresh?.recoveryCiphertext, null);
      assert.equal(refresh?.recoveryNonce, null);
      assert.equal(refresh?.recoveryAuthTag, null);
      assert.equal(refresh?.recoveryKeyId, null);
      assert.equal(refresh?.recoveryExpiresAt, null);
    });

    void test('is one-shot after the legacy username has been replaced', async () => {
      await createLegacyAdmin();
      await updateInitialAdminCredentials(prisma, {
        username: 'updated_admin',
        password: '654321',
      });

      await assert.rejects(
        updateInitialAdminCredentials(prisma, {
          username: 'second_admin',
          password: '456789',
        }),
        (error: unknown) =>
          error instanceof CredentialUpdateError && error.code === 'ALREADY_UPDATED',
      );
    });
  },
);
