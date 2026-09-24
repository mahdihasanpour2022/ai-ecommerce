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
}

interface ErrorBody {
  readonly code: string;
  readonly message: string;
}

interface VariantBody {
  readonly id: string;
  readonly productId: string;
  readonly sku: string;
  readonly size: string | null;
  readonly color: string | null;
  readonly priceRial: number;
  readonly isActive: boolean;
  readonly inventory: { readonly onHandQuantity: number; readonly version: number };
}

interface ProductBody {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly category: { readonly id: string; readonly name: string };
  readonly status: 'ACTIVE' | 'ARCHIVED' | 'DRAFT';
  readonly imageVersion: number;
  readonly variants: VariantBody[];
  readonly images: Array<{ readonly id: string; readonly position: number }>;
}

interface ProductListBody {
  readonly items: Array<{
    readonly id: string;
    readonly description: string | null;
    readonly variantCount: number;
    readonly activeVariantCount: number;
    readonly sizes: string[];
    readonly colors: string[];
    readonly minimumPriceRial: number;
    readonly maximumPriceRial: number;
    readonly totalOnHandQuantity: number;
    readonly mainImage: { readonly id: string } | null;
  }>;
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
}

interface OpenApiOperation {
  readonly security?: Array<Record<string, unknown>>;
  readonly parameters?: Array<{
    readonly name?: string;
    readonly in?: string;
    readonly required?: boolean;
  }>;
  readonly responses?: Record<string, unknown>;
}

interface OpenApiDocument {
  readonly paths: Record<string, Record<string, OpenApiOperation | undefined>>;
  readonly components: { readonly schemas: Record<string, unknown> };
}

function server(app: INestApplication): App {
  return app.getHttpServer() as App;
}

function responseCookies(response: Response): string[] {
  const value = (response.headers as Record<string, unknown>)['set-cookie'];
  assert.ok(Array.isArray(value));
  assert.ok((value as unknown[]).every((cookie) => typeof cookie === 'string'));
  return value as string[];
}

function responseBody<T>(response: Response): T {
  const value = response.body as unknown;
  if (typeof value !== 'object' || value === null || !('hasError' in value)) return value as T;
  const envelope = value as { hasError: boolean; result: T | null; singleResult: T | null };
  return (envelope.hasError ? envelope : (envelope.singleResult ?? envelope.result)) as T;
}

function cookiePair(cookies: readonly string[], name: string): string {
  const cookie = cookies.find((candidate) => candidate.startsWith(`${name}=`));
  assert.ok(cookie);
  return cookie.slice(0, cookie.indexOf(';'));
}

void describe(
  'protected Admin Product and Variant PostgreSQL and HTTP contract',
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
      await prisma.role.deleteMany({ where: { code: { startsWith: 'TEST_PRODUCT_' } } });
      loginSecurity.resetForTests();
    }

    async function createSession(roleCode = 'SUPER_ADMIN'): Promise<SessionHeaders> {
      const role = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });
      const password = '654321';
      const email = `product-${randomUUID()}@example.invalid`;
      await prisma.adminUser.create({
        data: {
          email,
          username: `u_${randomUUID().replaceAll('-', '').slice(0, 18)}`,
          displayName: 'Product Contract Admin',
          passwordHash: await argon2.hash(password, {
            type: argon2.argon2id,
            memoryCost: 65_536,
            timeCost: 3,
            parallelism: 1,
            hashLength: 32,
          }),
          roles: { create: { roleId: role.id } },
        },
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
      };
    }

    function mutation(
      method: 'delete' | 'patch' | 'post',
      path: string,
      session = superAdmin,
    ): request.Test {
      const agent = request(server(app));
      const pending =
        method === 'post' ? agent.post(path) : method === 'patch' ? agent.patch(path) : agent.delete(path);
      return pending
        .set('Cookie', session.accessCookie)
        .set('Origin', allowedOrigin)
        .set('Sec-Fetch-Site', 'same-origin')
        .set('X-CSRF-Token', session.csrfToken);
    }

    async function createCategory(name = 'Apparel'): Promise<string> {
      return (
        await prisma.category.create({
          data: { name, nameKey: name.toLowerCase() },
          select: { id: true },
        })
      ).id;
    }

    async function createProduct(
      categoryId: string,
      overrides: Readonly<Record<string, unknown>> = {},
    ): Promise<ProductBody> {
      const response = await mutation('post', '/api/v1/admin/catalog/products')
        .send({
          name: 'Cotton Shirt',
          description: 'Soft cotton shirt',
          categoryId,
          variants: [
            {
              size: 'M',
              color: 'Black',
              priceRial: 120_000,
              onHandQuantity: 3,
            },
          ],
          ...overrides,
        })
        .expect(201);
      return responseBody<ProductBody>(response);
    }

    async function addReadyMainImage(productId: string): Promise<string> {
      const image = await prisma.productImage.create({
        data: {
          productId,
          storageKey: `objects/${randomUUID()}.webp`,
          mediaType: 'WEBP',
          byteSize: 128,
          width: 20,
          height: 20,
          position: 0,
        },
        select: { id: true },
      });
      return image.id;
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

    void test('atomically creates normalized Products, Variants, Inventory, detail, and summaries', async () => {
      const categoryId = await createCategory('Shirts');
      const response = await mutation('post', '/api/v1/admin/catalog/products')
        .send({
          name: '  پیراهن   نخی ',
          description: '  توضیح محصول  ',
          categoryId,
          variants: [
            {
              size: ' Ｍ ',
              color: ' مشکی ',
              priceRial: 120_000,
              onHandQuantity: 4,
            },
            {
              size: 'L',
              color: 'مشکی',
              priceRial: 140_000,
              onHandQuantity: 1,
            },
          ],
        })
        .expect(201)
        .expect('Cache-Control', 'no-store');
      const product = responseBody<ProductBody>(response);
      assert.equal(product.name, 'پیراهن نخی');
      assert.equal(product.status, 'DRAFT');
      assert.equal(new Set(product.variants.map(({ sku }) => sku)).size, 2);
      for (const variant of product.variants) {
        assert.match(variant.sku, /^SKU-[0-9A-F]{32}$/u);
      }
      assert.equal(product.variants[0]?.inventory.version, 1);
      assert.equal(await prisma.inventory.count(), 2);

      const detail = await request(server(app))
        .get(`/api/v1/admin/catalog/products/${product.id}`)
        .set('Cookie', superAdmin.accessCookie)
        .expect(200);
      assert.equal(responseBody<ProductBody>(detail).category.id, categoryId);

      const list = await request(server(app))
        .get(
          `/api/v1/admin/catalog/products?page=1&pageSize=10&categoryId=${categoryId}&status=DRAFT`,
        )
        .set('Cookie', superAdmin.accessCookie)
        .expect(200);
      const listBody = responseBody<ProductListBody>(list);
      assert.deepEqual(
        {
          page: listBody.page,
          pageSize: listBody.pageSize,
          totalItems: listBody.totalItems,
          totalPages: listBody.totalPages,
        },
        { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
      );
      assert.equal(listBody.items[0]?.variantCount, 2);
      assert.equal(listBody.items[0]?.activeVariantCount, 2);
      assert.equal(listBody.items[0]?.description, 'توضیح محصول');
      assert.deepEqual(new Set(listBody.items[0]?.sizes), new Set(['M', 'L']));
      assert.deepEqual(listBody.items[0]?.colors, ['مشکی']);
      assert.equal(listBody.items[0]?.minimumPriceRial, 120_000);
      assert.equal(listBody.items[0]?.maximumPriceRial, 140_000);
      assert.equal(listBody.items[0]?.totalOnHandQuantity, 5);
      assert.equal('storageKey' in (listBody.items[0] ?? {}), false);
    });

    void test('permanently deletes complete Product aggregates in every lifecycle status', async () => {
      const categoryId = await createCategory('Deletion');
      for (const status of ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const) {
        const product = await createProduct(categoryId, { name: `Delete ${status}` });
        await addReadyMainImage(product.id);
        if (status !== 'DRAFT') {
          await mutation('patch', `/api/v1/admin/catalog/products/${product.id}`)
            .send({ status })
            .expect(200);
        }

        await mutation('delete', `/api/v1/admin/catalog/products/${product.id}`)
          .expect(200)
          .expect((response: Response) =>
            assert.equal((response.body as ErrorBody).code, 'PRODUCT_DELETED'),
          );
        await request(server(app))
          .get(`/api/v1/admin/catalog/products/${product.id}`)
          .set('Cookie', superAdmin.accessCookie)
          .expect(404);
      }

      assert.equal(await prisma.product.count(), 0);
      assert.equal(await prisma.productVariant.count(), 0);
      assert.equal(await prisma.inventory.count(), 0);
      assert.equal(await prisma.productImage.count(), 0);
      assert.equal(await prisma.productImageCleanup.count(), 0);
      await mutation('delete', `/api/v1/admin/catalog/products/${randomUUID()}`).expect(404);
    });

    void test('rejects malformed requests and rolls back the complete Product aggregate', async () => {
      const categoryId = await createCategory();
      await mutation('post', '/api/v1/admin/catalog/products')
        .send({
          name: 'Rollback',
          categoryId,
          variants: [
            { size: 'M', color: 'Black', priceRial: 1000, onHandQuantity: 1 },
            { size: 'm', color: 'black', priceRial: 2000, onHandQuantity: 1 },
          ],
        })
        .expect(409)
        .expect((response: Response) =>
          assert.equal(responseBody<ErrorBody>(response).code, 'VARIANT_COMBINATION_CONFLICT'),
        );
      assert.equal(await prisma.product.count(), 0);
      assert.equal(await prisma.productVariant.count(), 0);
      assert.equal(await prisma.inventory.count(), 0);

      await mutation('post', '/api/v1/admin/catalog/products')
        .send({
          name: 'Missing Category',
          categoryId: randomUUID(),
          variants: [{ priceRial: 1000, onHandQuantity: 1 }],
        })
        .expect(404)
        .expect((response: Response) =>
          assert.equal(responseBody<ErrorBody>(response).code, 'CATEGORY_NOT_FOUND'),
        );
      await mutation('post', '/api/v1/admin/catalog/products')
        .send({
          name: 'Invalid Price',
          categoryId,
          variants: [{ priceRial: 1001, onHandQuantity: 1 }],
          unexpected: true,
        })
        .expect(400);
      await request(server(app))
        .get('/api/v1/admin/catalog/products?pageSize=101')
        .set('Cookie', superAdmin.accessCookie)
        .expect(400);
      await request(server(app))
        .get(`/api/v1/admin/catalog/products?categoryId=${randomUUID()}`)
        .set('Cookie', superAdmin.accessCookie)
        .expect(404);
    });

    void test('creates, updates, and reactivates retained Variants with stable conflicts', async () => {
      const categoryId = await createCategory();
      const product = await createProduct(categoryId);
      const defaultProduct = await createProduct(categoryId, {
        name: 'Default Variant Product',
        variants: [{ priceRial: 1000, onHandQuantity: 1 }],
      });
      assert.equal(defaultProduct.variants[0]?.size, null);
      assert.equal(defaultProduct.variants[0]?.color, null);
      const second = await mutation('post', `/api/v1/admin/catalog/products/${product.id}/variants`)
        .send({
          sku: 'SECOND-L',
          size: 'L',
          color: 'Black',
          priceRial: 130_000,
          isActive: false,
        })
        .expect(201);
      const secondBody = responseBody<VariantBody>(second);
      assert.equal(secondBody.isActive, false);
      assert.deepEqual(secondBody.inventory, { onHandQuantity: 0, version: 1 });

      const reactivated = await mutation('patch', `/api/v1/admin/catalog/variants/${secondBody.id}`)
        .send({
          sku: ' second-l-updated ',
          color: ' Navy ',
          isActive: true,
          priceRial: 150_000,
        })
        .expect(200);
      const reactivatedBody = responseBody<VariantBody>(reactivated);
      assert.equal(reactivatedBody.isActive, true);
      assert.equal(reactivatedBody.sku, 'SECOND-L-UPDATED');
      assert.equal(reactivatedBody.color, 'Navy');

      await mutation('post', `/api/v1/admin/catalog/products/${product.id}/variants`)
        .send({ sku: reactivatedBody.sku, size: 'XL', priceRial: 1000 })
        .expect(409)
        .expect((response: Response) =>
          assert.equal(responseBody<ErrorBody>(response).code, 'SKU_CONFLICT'),
        );
      await mutation('post', `/api/v1/admin/catalog/products/${product.id}/variants`)
        .send({ sku: 'OTHER-SKU', size: 'L', color: 'navy', priceRial: 1000 })
        .expect(409)
        .expect((response: Response) =>
          assert.equal(responseBody<ErrorBody>(response).code, 'VARIANT_COMBINATION_CONFLICT'),
        );
      await mutation('post', `/api/v1/admin/catalog/products/${product.id}/variants`)
        .send({ sku: 'DEFAULT-ACTIVE', priceRial: 1000 })
        .expect(409)
        .expect((response: Response) =>
          assert.equal(responseBody<ErrorBody>(response).code, 'VARIANT_MODE_CONFLICT'),
        );
    });

    void test('enforces activation completeness, last-active Variant, and Archived immutability', async () => {
      const categoryId = await createCategory();
      const product = await createProduct(categoryId, {
        description: null,
        variants: [
          {
            size: 'M',
            priceRial: 1000,
            onHandQuantity: 1,
          },
        ],
      });
      const replacementCategoryId = await createCategory('Updated Apparel');
      const updated = await mutation('patch', `/api/v1/admin/catalog/products/${product.id}`)
        .send({ name: '  Updated   Product ', categoryId: replacementCategoryId })
        .expect(200);
      assert.equal(responseBody<ProductBody>(updated).name, 'Updated Product');
      assert.equal(responseBody<ProductBody>(updated).category.id, replacementCategoryId);
      await mutation('patch', `/api/v1/admin/catalog/products/${product.id}`)
        .send({ status: 'ACTIVE' })
        .expect(409)
        .expect((response: Response) =>
          assert.equal(responseBody<ErrorBody>(response).code, 'PRODUCT_ACTIVATION_INCOMPLETE'),
        );

      const imageId = await addReadyMainImage(product.id);
      const active = await mutation('patch', `/api/v1/admin/catalog/products/${product.id}`)
        .send({ description: 'Now complete', status: 'ACTIVE' })
        .expect(200);
      assert.equal(responseBody<ProductBody>(active).images[0]?.id, imageId);
      assert.equal(responseBody<ProductBody>(active).variants[0]?.inventory.onHandQuantity, 1);
      const activeList = await request(server(app))
        .get('/api/v1/admin/catalog/products?status=ACTIVE')
        .set('Cookie', superAdmin.accessCookie)
        .expect(200);
      assert.equal(responseBody<ProductListBody>(activeList).items[0]?.mainImage?.id, imageId);

      await mutation('patch', `/api/v1/admin/catalog/variants/${product.variants[0]?.id ?? ''}`)
        .send({ isActive: false })
        .expect(409)
        .expect((response: Response) =>
          assert.equal(responseBody<ErrorBody>(response).code, 'VARIANT_MODE_CONFLICT'),
        );
      await mutation('patch', `/api/v1/admin/catalog/products/${product.id}`)
        .send({ description: null })
        .expect(409)
        .expect((response: Response) =>
          assert.equal(responseBody<ErrorBody>(response).code, 'PRODUCT_ACTIVATION_INCOMPLETE'),
        );

      await mutation('patch', `/api/v1/admin/catalog/products/${product.id}`)
        .send({ status: 'ARCHIVED' })
        .expect(200);
      await mutation('patch', `/api/v1/admin/catalog/products/${product.id}`)
        .send({ name: 'Forbidden archived edit' })
        .expect(409)
        .expect((response: Response) =>
          assert.equal(responseBody<ErrorBody>(response).code, 'PRODUCT_LIFECYCLE_CONFLICT'),
        );
      await mutation('patch', `/api/v1/admin/catalog/variants/${product.variants[0]?.id ?? ''}`)
        .send({ priceRial: 200_000 })
        .expect(409);
      await mutation('patch', `/api/v1/admin/catalog/products/${product.id}`)
        .send({ status: 'DRAFT' })
        .expect(200);
    });

    void test('uses created-time and UUID tie-breakers for bounded Product pages', async () => {
      const categoryId = await createCategory();
      const products = await Promise.all([
        createProduct(categoryId),
        createProduct(categoryId),
        createProduct(categoryId),
      ]);
      const [oldest, ...newest] = products;
      assert.ok(oldest);
      await prisma.product.update({
        where: { id: oldest.id },
        data: {
          createdAt: new Date('2028-01-01T00:00:00.000Z'),
          updatedAt: new Date('2040-01-01T00:00:00.000Z'),
        },
      });
      await prisma.product.updateMany({
        where: { id: { in: newest.map(({ id }) => id) } },
        data: {
          createdAt: new Date('2030-01-01T00:00:00.000Z'),
          updatedAt: new Date('2040-01-01T00:00:00.000Z'),
        },
      });
      const response = await request(server(app))
        .get('/api/v1/admin/catalog/products?page=1&pageSize=2')
        .set('Cookie', superAdmin.accessCookie)
        .expect(200);
      const body = responseBody<ProductListBody>(response);
      const expectedIds = newest
        .map(({ id }) => id)
        .sort()
        .reverse();
      assert.deepEqual(
        body.items.map(({ id }) => id),
        expectedIds,
      );
      assert.equal(body.totalItems, 3);
      assert.equal(body.totalPages, 2);
    });

    void test('combines protected Product name, variant, inventory, date, category, status, and price filters', async () => {
      const categoryId = await createCategory('Filtered category');
      const otherCategoryId = await createCategory('Other category');
      const matching = await createProduct(categoryId, {
        name: 'Premium Cotton Shirt',
        variants: [{ size: 'M', color: 'Black', priceRial: 120_000, onHandQuantity: 3 }],
      });
      await createProduct(categoryId, {
        name: 'Premium Cotton Shirt unavailable',
        variants: [{ size: 'M', color: 'Black', priceRial: 120_000, onHandQuantity: 1 }],
      }).then(async (product) => {
        await prisma.inventory.update({
          where: { variantId: product.variants[0]?.id ?? '' },
          data: { onHandQuantity: 0 },
        });
      });
      await createProduct(otherCategoryId, {
        name: 'Premium Cotton Shirt other',
        variants: [{ size: 'M', color: 'Black', priceRial: 120_000, onHandQuantity: 3 }],
      });
      await prisma.product.update({
        where: { id: matching.id },
        data: { createdAt: new Date('2026-09-20T20:00:00.000Z') },
      });

      const response = await request(server(app))
        .get('/api/v1/admin/catalog/products')
        .query({
          name: 'cotton shirt',
          categoryId,
          size: 'm',
          color: 'black',
          status: 'DRAFT',
          availability: 'IN_STOCK',
          createdFrom: '2026-09-20T00:00:00.000Z',
          createdTo: '2026-09-20T23:59:59.000Z',
          minimumPriceRial: '100000',
          maximumPriceRial: '130000',
        })
        .set('Cookie', superAdmin.accessCookie)
        .expect(200);

      assert.deepEqual(responseBody<ProductListBody>(response).items.map(({ id }) => id), [matching.id]);
    });

    void test('returns protected server-owned Product size and color options', async () => {
      await request(server(app)).get('/api/v1/admin/catalog/product-options/sizes').expect(401);

      const sizes = await request(server(app))
        .get('/api/v1/admin/catalog/product-options/sizes')
        .set('Cookie', superAdmin.accessCookie)
        .expect(200);
      assert.deepEqual(responseBody<string[]>(sizes), [
        'small',
        'medium',
        'large',
        'x-large',
        '2x-large',
        '3x-large',
      ]);

      const colors = await request(server(app))
        .get('/api/v1/admin/catalog/product-options/colors')
        .set('Cookie', superAdmin.accessCookie)
        .expect(200);
      assert.deepEqual(responseBody<Array<Record<string, string>>>(colors), [
        { 'color-name': 'blue', 'hex-code': '#2563EB' },
        { 'color-name': 'red', 'hex-code': '#DC2626' },
        { 'color-name': 'green', 'hex-code': '#16A34A' },
        { 'color-name': 'white', 'hex-code': '#FFFFFF' },
        { 'color-name': 'black', 'hex-code': '#111827' },
      ]);
    });

    void test('serializes conflicting aggregate mutations and global SKU races', async () => {
      const categoryId = await createCategory();
      const product = await createProduct(categoryId, {
        variants: [
          { size: 'M', priceRial: 1000, onHandQuantity: 1 },
          { size: 'L', priceRial: 1000, onHandQuantity: 1 },
        ],
      });
      await addReadyMainImage(product.id);
      await mutation('patch', `/api/v1/admin/catalog/products/${product.id}`)
        .send({ status: 'ACTIVE' })
        .expect(200);
      const deactivate = await Promise.all(
        product.variants.map((variant) =>
          mutation('patch', `/api/v1/admin/catalog/variants/${variant.id}`).send({
            isActive: false,
          }),
        ),
      );
      assert.deepEqual(deactivate.map(({ status }) => status).sort(), [200, 409]);
      assert.equal(
        await prisma.productVariant.count({ where: { productId: product.id, isActive: true } }),
        1,
      );

      const productA = await createProduct(categoryId);
      const productB = await createProduct(categoryId);
      const race = await Promise.all([
        mutation('post', `/api/v1/admin/catalog/products/${productA.id}/variants`).send({
          sku: 'GLOBAL-RACE',
          size: 'XL',
          priceRial: 1000,
          isActive: false,
        }),
        mutation('post', `/api/v1/admin/catalog/products/${productB.id}/variants`).send({
          sku: 'global-race',
          size: 'XL',
          priceRial: 1000,
          isActive: false,
        }),
      ]);
      assert.deepEqual(race.map(({ status }) => status).sort(), [201, 409]);
      assert.equal(await prisma.productVariant.count({ where: { sku: 'GLOBAL-RACE' } }), 1);
    });

    void test('enforces authentication, exact permission, and mutation CSRF', async () => {
      await request(server(app)).get('/api/v1/admin/catalog/products').expect(401);
      const adminAccess = await prisma.permission.findUniqueOrThrow({
        where: { code: 'admin.access' },
      });
      await prisma.role.create({
        data: {
          code: 'TEST_PRODUCT_NO_ACCESS',
          permissions: { create: { permissionId: adminAccess.id } },
        },
      });
      const insufficient = await createSession('TEST_PRODUCT_NO_ACCESS');
      await request(server(app))
        .get('/api/v1/admin/catalog/products')
        .set('Cookie', insufficient.accessCookie)
        .expect(403)
        .expect((response: Response) =>
          assert.equal(responseBody<ErrorBody>(response).code, 'INSUFFICIENT_PERMISSION'),
        );

      await request(server(app))
        .post('/api/v1/admin/catalog/products')
        .set('Cookie', superAdmin.accessCookie)
        .set('Origin', allowedOrigin)
        .set('Sec-Fetch-Site', 'same-origin')
        .send({})
        .expect(403)
        .expect((response: Response) =>
          assert.equal(responseBody<ErrorBody>(response).code, 'CSRF_VALIDATION_FAILED'),
        );
    });

    void test('publishes exact protected Product and Variant OpenAPI operations', async () => {
      const response = await request(server(app)).get('/api/docs-json').expect(200);
      const document = responseBody<OpenApiDocument>(response);
      const expected: ReadonlyArray<readonly [string, string, readonly string[]]> = [
        ['/api/v1/admin/catalog/product-options/sizes', 'get', ['200', '401', '403']],
        ['/api/v1/admin/catalog/product-options/colors', 'get', ['200', '401', '403']],
        ['/api/v1/admin/catalog/products', 'get', ['200', '400', '401', '403', '404', '500']],
        [
          '/api/v1/admin/catalog/products',
          'post',
          ['201', '400', '401', '403', '404', '409', '500'],
        ],
        [
          '/api/v1/admin/catalog/products/{productId}',
          'get',
          ['200', '400', '401', '403', '404', '500'],
        ],
        [
          '/api/v1/admin/catalog/products/{productId}',
          'patch',
          ['200', '400', '401', '403', '404', '409', '500'],
        ],
        [
          '/api/v1/admin/catalog/products/{productId}',
          'delete',
          ['200', '400', '401', '403', '404', '500'],
        ],
        [
          '/api/v1/admin/catalog/products/{productId}/variants',
          'post',
          ['201', '400', '401', '403', '404', '409', '500'],
        ],
        [
          '/api/v1/admin/catalog/variants/{variantId}',
          'patch',
          ['200', '400', '401', '403', '404', '409', '500'],
        ],
      ];
      for (const [path, method, statuses] of expected) {
        const operation = document.paths[path]?.[method];
        assert.ok(operation);
        assert.deepEqual(operation.security, [{ adminAccess: [] }]);
        assert.deepEqual(Object.keys(operation.responses ?? {}).sort(), [...statuses].sort());
      }
      const listParameters =
        document.paths['/api/v1/admin/catalog/products']?.get?.parameters ?? [];
      assert.deepEqual(listParameters.map(({ name }) => name).sort(), [
        'availability',
        'categoryId',
        'color',
        'createdFrom',
        'createdTo',
        'maximumPriceRial',
        'minimumPriceRial',
        'name',
        'page',
        'pageSize',
        'size',
        'status',
      ]);
      for (const name of ['createdFrom', 'createdTo']) {
        const parameter = listParameters.find((item) => item.name === name);
        assert.equal((parameter as { readonly schema?: { readonly format?: string } } | undefined)?.schema?.format, 'date-time');
      }
      for (const operation of [
        document.paths['/api/v1/admin/catalog/products']?.post,
        document.paths['/api/v1/admin/catalog/products/{productId}']?.patch,
        document.paths['/api/v1/admin/catalog/products/{productId}']?.delete,
        document.paths['/api/v1/admin/catalog/products/{productId}/variants']?.post,
        document.paths['/api/v1/admin/catalog/variants/{variantId}']?.patch,
      ]) {
        assert.ok(
          operation?.parameters?.some(
            ({ name, in: location }) => name === 'X-CSRF-Token' && location === 'header',
          ),
        );
      }
      for (const schema of [
        'CreateProductRequestDto',
        'InitialVariantRequestDto',
        'UpdateProductRequestDto',
        'CreateVariantRequestDto',
        'UpdateVariantRequestDto',
        'ProductDetailDto',
        'ProductListResponseDto',
        'ProductVariantResponseDto',
        'ProductColorOptionDto',
      ]) {
        assert.ok(document.components.schemas[schema]);
      }
      const createProductSchema = document.components.schemas.CreateProductRequestDto as {
        readonly required?: string[];
        readonly properties?: Record<string, unknown>;
      };
      assert.deepEqual(createProductSchema.required?.sort(), ['categoryId', 'name', 'variants']);
      assert.deepEqual(Object.keys(createProductSchema.properties ?? {}).sort(), [
        'categoryId',
        'description',
        'name',
        'variants',
      ]);
      assert.equal(
        (createProductSchema.properties?.description as { readonly maxLength?: number }).maxLength,
        200,
      );
      const initialVariantSchema = document.components.schemas.InitialVariantRequestDto as {
        readonly required?: string[];
        readonly properties?: Record<string, unknown>;
      };
      assert.deepEqual(initialVariantSchema.required?.sort(), ['onHandQuantity', 'priceRial']);
      assert.deepEqual(Object.keys(initialVariantSchema.properties ?? {}).sort(), [
        'color',
        'isActive',
        'onHandQuantity',
        'priceRial',
        'size',
      ]);
      const createVariantSchema = document.components.schemas.CreateVariantRequestDto as {
        readonly required?: string[];
        readonly properties?: Record<string, unknown>;
      };
      assert.deepEqual(createVariantSchema.required?.sort(), ['priceRial', 'sku']);
      assert.deepEqual(Object.keys(createVariantSchema.properties ?? {}).sort(), [
        'color',
        'isActive',
        'onHandQuantity',
        'priceRial',
        'size',
        'sku',
      ]);
      assert.doesNotMatch(JSON.stringify(document), /storageKey|sizeKey|colorKey/u);
    });
  },
);
