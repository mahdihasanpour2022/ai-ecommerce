import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, beforeEach, describe, test } from 'node:test';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import type { Response } from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module.js';
import { configureApplication } from '../src/application.js';
import { ACCESS_COOKIE_NAME } from '../src/authentication/authentication.constants.js';
import { LoginSecurity } from '../src/authentication/login-security.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { createTestEnvironment } from './test-environment.js';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const allowedOrigin = 'http://localhost:3001';

interface SessionHeaders {
  readonly accessCookie: string;
  readonly csrfToken: string;
  readonly adminUserId: string;
  readonly sessionId: string;
}

interface ErrorBody {
  readonly code: string;
  readonly [key: string]: unknown;
}

interface InventoryBody {
  readonly onHandQuantity: number;
  readonly version: number;
}

interface OpenApiOperation {
  readonly security?: Array<Record<string, unknown>>;
  readonly parameters?: Array<{ readonly name?: string; readonly in?: string }>;
  readonly responses?: Record<string, unknown>;
  readonly requestBody?: {
    readonly content?: Record<string, { readonly schema?: { readonly $ref?: string } }>;
  };
}

interface OpenApiDocument {
  readonly paths: Record<string, Record<string, OpenApiOperation | undefined>>;
  readonly components: {
    readonly schemas: Record<
      string,
      {
        readonly required?: string[];
        readonly properties?: Record<
          string,
          { readonly minimum?: number; readonly maximum?: number }
        >;
      }
    >;
  };
}

function server(app: INestApplication): App {
  return app.getHttpServer() as App;
}

function responseBody<T>(response: Response): T {
  return response.body as T;
}

function responseCookies(response: Response): string[] {
  const value = (response.headers as Record<string, unknown>)['set-cookie'];
  assert.ok(Array.isArray(value));
  return value as string[];
}

function cookiePair(cookies: readonly string[], name: string): string {
  const cookie = cookies.find((candidate) => candidate.startsWith(`${name}=`));
  assert.ok(cookie);
  return cookie.slice(0, cookie.indexOf(';'));
}

void describe(
  'protected Admin Inventory PostgreSQL and HTTP contract',
  { skip: testDatabaseUrl === undefined, concurrency: 1 },
  () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let loginSecurity: LoginSecurity;
    let superAdmin: SessionHeaders;

    async function clearCatalog(): Promise<void> {
      await prisma.$transaction(async (transaction) => {
        await transaction.productImage.deleteMany();
        await transaction.inventory.deleteMany();
        await transaction.productVariant.deleteMany();
        await transaction.product.deleteMany();
        await transaction.category.deleteMany();
        await transaction.productImageCleanup.deleteMany();
      });
    }

    async function clearAll(): Promise<void> {
      await clearCatalog();
      await prisma.authSession.deleteMany();
      await prisma.adminLoginThrottle.deleteMany();
      await prisma.adminUser.deleteMany();
      await prisma.role.deleteMany({ where: { code: { startsWith: 'TEST_INVENTORY_' } } });
      loginSecurity.resetForTests();
    }

    async function createSession(roleCode = 'SUPER_ADMIN'): Promise<SessionHeaders> {
      const role = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });
      const password = '654321';
      const email = `inventory-${randomUUID()}@example.invalid`;
      const admin = await prisma.adminUser.create({
        data: {
          email,
          username: `u_${randomUUID().replaceAll('-', '').slice(0, 18)}`,
          displayName: 'Inventory Contract Admin',
          passwordHash: await argon2.hash(password, {
            type: argon2.argon2id,
            memoryCost: 65_536,
            timeCost: 3,
            parallelism: 1,
            hashLength: 32,
          }),
          roles: { create: { roleId: role.id } },
        },
        select: { id: true },
      });
      const login = await request(server(app))
        .post('/api/v1/auth/login')
        .set('Origin', allowedOrigin)
        .set('Sec-Fetch-Site', 'same-origin')
        .send({ identifier: email, password })
        .expect(200);
      return {
        accessCookie: cookiePair(responseCookies(login), ACCESS_COOKIE_NAME),
        csrfToken: responseBody<{ csrfToken: string }>(login).csrfToken,
        adminUserId: admin.id,
        sessionId: (
          await prisma.authSession.findFirstOrThrow({
            where: { adminUserId: admin.id },
            select: { id: true },
          })
        ).id,
      };
    }

    function updateInventory(variantId: string, body: object, session = superAdmin): request.Test {
      return request(server(app))
        .put(`/api/v1/admin/catalog/variants/${variantId}/inventory`)
        .set('Cookie', session.accessCookie)
        .set('Origin', allowedOrigin)
        .set('Sec-Fetch-Site', 'same-origin')
        .set('X-CSRF-Token', session.csrfToken)
        .send(body);
    }

    async function createVariant(
      status: 'ACTIVE' | 'ARCHIVED' | 'DRAFT' = 'DRAFT',
    ): Promise<string> {
      return prisma.$transaction(async (transaction) => {
        const category = await transaction.category.create({
          data: { name: `Inventory ${randomUUID()}`, nameKey: randomUUID() },
          select: { id: true },
        });
        const product = await transaction.product.create({
          data: {
            name: 'Inventory Product',
            description: status === 'ACTIVE' ? 'Complete product' : null,
            categoryId: category.id,
            status,
          },
          select: { id: true },
        });
        const variant = await transaction.productVariant.create({
          data: {
            productId: product.id,
            sku: `INV-${randomUUID()}`.toUpperCase(),
            size: 'M',
            sizeKey: 'm',
            color: null,
            colorKey: null,
            priceRial: 1000n,
          },
          select: { id: true },
        });
        await transaction.inventory.create({
          data: { variantId: variant.id, onHandQuantity: 5 },
        });
        if (status === 'ACTIVE') {
          await transaction.productImage.create({
            data: {
              productId: product.id,
              storageKey: `test/${randomUUID()}.webp`,
              mediaType: 'WEBP',
              byteSize: 128,
              width: 20,
              height: 20,
              position: 0,
            },
          });
        }
        return variant.id;
      });
    }

    void before(async () => {
      assert.ok(testDatabaseUrl);
      const environment = createTestEnvironment('test', { DATABASE_URL: testDatabaseUrl });
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule.forRoot(environment)],
      }).compile();
      app = moduleRef.createNestApplication({ logger: false });
      configureApplication(app, environment);
      await app.init();
      prisma = moduleRef.get(PrismaService);
      loginSecurity = moduleRef.get(LoginSecurity);
      await clearAll();
      superAdmin = await createSession();
    });

    void beforeEach(clearCatalog);

    void after(async () => {
      await clearAll();
      await app.close();
    });

    void test('sets exact zero, unchanged, and maximum quantities while incrementing once', async () => {
      const variantId = await createVariant('ACTIVE');
      const zero = await updateInventory(variantId, { onHandQuantity: 0, version: 1 }).expect(200);
      assert.deepEqual(responseBody<InventoryBody>(zero), { onHandQuantity: 0, version: 2 });
      const unchanged = await updateInventory(variantId, {
        onHandQuantity: 0,
        version: 2,
      }).expect(200);
      assert.deepEqual(responseBody<InventoryBody>(unchanged), { onHandQuantity: 0, version: 3 });
      const maximum = await updateInventory(variantId, {
        onHandQuantity: 2_147_483_647,
        version: 3,
      }).expect(200);
      assert.deepEqual(responseBody<InventoryBody>(maximum), {
        onHandQuantity: 2_147_483_647,
        version: 4,
      });
      assert.deepEqual(
        await prisma.inventory.findUniqueOrThrow({
          where: { variantId },
          select: { onHandQuantity: true, version: true },
        }),
        { onHandQuantity: 2_147_483_647, version: 4 },
      );
    });

    void test('rejects stale, malformed, missing, and Archived updates without mutation', async () => {
      const variantId = await createVariant();
      await updateInventory(variantId, { onHandQuantity: 7, version: 1 }).expect(200);
      const stale = await updateInventory(variantId, { onHandQuantity: 9, version: 1 }).expect(409);
      const staleBody = responseBody<ErrorBody>(stale);
      assert.equal(staleBody.code, 'INVENTORY_VERSION_CONFLICT');
      assert.equal('onHandQuantity' in staleBody, false);
      assert.equal('version' in staleBody, false);
      assert.deepEqual(
        await prisma.inventory.findUniqueOrThrow({
          where: { variantId },
          select: { onHandQuantity: true, version: true },
        }),
        { onHandQuantity: 7, version: 2 },
      );

      await updateInventory('not-a-uuid', { onHandQuantity: 1, version: 1 }).expect(400);
      await updateInventory(variantId, { onHandQuantity: -1, version: 2 }).expect(400);
      await updateInventory(variantId, {
        onHandQuantity: 1,
        version: 2,
        unexpected: true,
      }).expect(400);
      await updateInventory(randomUUID(), { onHandQuantity: 1, version: 1 })
        .expect(404)
        .expect((response: Response) =>
          assert.equal(responseBody<ErrorBody>(response).code, 'PRODUCT_VARIANT_NOT_FOUND'),
        );

      const archivedVariantId = await createVariant('ARCHIVED');
      await updateInventory(archivedVariantId, { onHandQuantity: 1, version: 1 })
        .expect(409)
        .expect((response: Response) =>
          assert.equal(responseBody<ErrorBody>(response).code, 'PRODUCT_LIFECYCLE_CONFLICT'),
        );
      assert.deepEqual(
        await prisma.inventory.findUniqueOrThrow({
          where: { variantId: archivedVariantId },
          select: { onHandQuantity: true, version: true },
        }),
        { onHandQuantity: 5, version: 1 },
      );
    });

    void test('allows exactly one winner for concurrent same-version requests', async () => {
      const variantId = await createVariant();
      const responses = await Promise.all([
        updateInventory(variantId, { onHandQuantity: 11, version: 1 }),
        updateInventory(variantId, { onHandQuantity: 22, version: 1 }),
      ]);
      assert.deepEqual(responses.map(({ status }) => status).sort(), [200, 409]);
      const winner = responses.find(({ status }) => status === 200);
      assert.ok(winner);
      const winningBody = responseBody<InventoryBody>(winner);
      assert.equal(winningBody.version, 2);
      assert.deepEqual(
        await prisma.inventory.findUniqueOrThrow({
          where: { variantId },
          select: { onHandQuantity: true, version: true },
        }),
        winningBody,
      );
    });

    void test('enforces authentication, exact permission, CSRF, and current account state', async () => {
      const variantId = await createVariant();
      await request(server(app))
        .put(`/api/v1/admin/catalog/variants/${variantId}/inventory`)
        .send({ onHandQuantity: 1, version: 1 })
        .expect(401);

      const wrongPermissions = await prisma.permission.findMany({
        where: { code: { in: ['admin.access', 'catalog.manage'] } },
        select: { id: true },
      });
      assert.equal(wrongPermissions.length, 2);
      await prisma.role.create({
        data: {
          code: 'TEST_INVENTORY_NO_ACCESS',
          permissions: {
            create: wrongPermissions.map(({ id }) => ({ permissionId: id })),
          },
        },
      });
      const insufficient = await createSession('TEST_INVENTORY_NO_ACCESS');
      await updateInventory(variantId, { onHandQuantity: 1, version: 1 }, insufficient)
        .expect(403)
        .expect((response: Response) =>
          assert.equal(responseBody<ErrorBody>(response).code, 'INSUFFICIENT_PERMISSION'),
        );

      await request(server(app))
        .put(`/api/v1/admin/catalog/variants/${variantId}/inventory`)
        .set('Cookie', superAdmin.accessCookie)
        .set('Origin', allowedOrigin)
        .set('Sec-Fetch-Site', 'same-origin')
        .send({ onHandQuantity: 1, version: 1 })
        .expect(403)
        .expect((response: Response) =>
          assert.equal(responseBody<ErrorBody>(response).code, 'CSRF_VALIDATION_FAILED'),
        );

      await prisma.adminUser.update({
        where: { id: superAdmin.adminUserId },
        data: { disabledAt: new Date() },
      });
      await updateInventory(variantId, { onHandQuantity: 1, version: 1 })
        .expect(401)
        .expect((response: Response) =>
          assert.equal(responseBody<ErrorBody>(response).code, 'ACCOUNT_DISABLED'),
        );
      await prisma.adminUser.update({
        where: { id: superAdmin.adminUserId },
        data: { disabledAt: null },
      });
      await prisma.authSession.update({
        where: { id: superAdmin.sessionId },
        data: { revokedAt: new Date() },
      });
      await updateInventory(variantId, { onHandQuantity: 1, version: 1 })
        .expect(401)
        .expect((response: Response) =>
          assert.equal(responseBody<ErrorBody>(response).code, 'AUTHENTICATION_REQUIRED'),
        );
    });

    void test('publishes the exact Inventory OpenAPI contract and PUT CORS method', async () => {
      const response = await request(server(app)).get('/api/docs-json').expect(200);
      const document = responseBody<OpenApiDocument>(response);
      const operation = document.paths['/api/v1/admin/catalog/variants/{variantId}/inventory']?.put;
      assert.ok(operation);
      assert.deepEqual(operation.security, [{ adminAccess: [] }]);
      assert.match(JSON.stringify(operation), /INVENTORY_VERSION_CONFLICT/u);
      assert.deepEqual(Object.keys(operation.responses ?? {}).sort(), [
        '200',
        '400',
        '401',
        '403',
        '404',
        '409',
        '500',
      ]);
      assert.ok(
        operation.parameters?.some(
          ({ name, in: location }) => name === 'variantId' && location === 'path',
        ),
      );
      assert.ok(
        operation.parameters?.some(
          ({ name, in: location }) => name === 'X-CSRF-Token' && location === 'header',
        ),
      );
      assert.equal(
        operation.requestBody?.content?.['application/json']?.schema?.$ref,
        '#/components/schemas/UpdateInventoryRequestDto',
      );
      const requestSchema = document.components.schemas.UpdateInventoryRequestDto;
      assert.deepEqual(requestSchema?.required?.sort(), ['onHandQuantity', 'version']);
      assert.deepEqual(Object.keys(requestSchema?.properties ?? {}).sort(), [
        'onHandQuantity',
        'version',
      ]);
      assert.deepEqual(requestSchema?.properties?.onHandQuantity, {
        type: 'integer',
        minimum: 0,
        maximum: 2_147_483_647,
      });
      assert.deepEqual(requestSchema?.properties?.version, {
        type: 'integer',
        minimum: 1,
        maximum: 2_147_483_647,
      });

      const cors = await request(server(app))
        .options('/api/v1/admin/catalog/variants/example/inventory')
        .set('Origin', allowedOrigin)
        .set('Access-Control-Request-Method', 'PUT')
        .expect(204);
      assert.match(cors.headers['access-control-allow-methods'] as string, /PUT/u);
    });
  },
);
