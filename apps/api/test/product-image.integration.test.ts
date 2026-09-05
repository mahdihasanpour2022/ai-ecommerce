import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, beforeEach, describe, test } from 'node:test';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import sharp from 'sharp';
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
}

interface ImageBody {
  readonly id: string;
  readonly mediaType: 'JPEG' | 'PNG' | 'WEBP';
  readonly byteSize: number;
  readonly width: number;
  readonly height: number;
  readonly position: number;
}

interface CollectionBody {
  readonly imageVersion: number;
  readonly images: ImageBody[];
}

interface OpenApiOperation {
  readonly security?: Array<Record<string, unknown>>;
  readonly parameters?: Array<{ readonly name?: string; readonly in?: string }>;
  readonly requestBody?: unknown;
  readonly responses?: Record<string, unknown>;
}

interface OpenApiDocument {
  readonly paths: Record<string, Record<string, OpenApiOperation | undefined>>;
}

function server(app: INestApplication): App {
  return app.getHttpServer() as App;
}

function body<T>(response: Response): T {
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
  'secure Product Image PostgreSQL, storage, and HTTP contracts',
  { skip: testDatabaseUrl === undefined, concurrency: 1 },
  () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let loginSecurity: LoginSecurity;
    let superAdmin: SessionHeaders;
    let storageRoot: string;
    let png: Buffer;
    let jpeg: Buffer;
    let webp: Buffer;

    async function clearCatalog(): Promise<void> {
      await prisma.$transaction(async (transaction) => {
        await transaction.productImage.deleteMany();
        await transaction.inventory.deleteMany();
        await transaction.productVariant.deleteMany();
        await transaction.product.deleteMany();
        await transaction.category.deleteMany();
        await transaction.productImageCleanup.deleteMany();
      });
      await rm(storageRoot, { recursive: true, force: true });
    }

    async function clearAll(): Promise<void> {
      await clearCatalog();
      await prisma.authSession.deleteMany();
      await prisma.adminLoginThrottle.deleteMany();
      await prisma.adminUser.deleteMany();
      await prisma.role.deleteMany({ where: { code: { startsWith: 'TEST_IMAGE_' } } });
      loginSecurity.resetForTests();
    }

    async function createSession(roleCode = 'SUPER_ADMIN'): Promise<SessionHeaders> {
      const role = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });
      const password = '654321';
      const email = `image-${randomUUID()}@example.invalid`;
      await prisma.adminUser.create({
        data: {
          email,
          username: `u_${randomUUID().replaceAll('-', '').slice(0, 18)}`,
          displayName: 'Image Contract Admin',
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
        csrfToken: body<{ csrfToken: string }>(login).csrfToken,
      };
    }

    function mutation(method: 'delete' | 'post' | 'put', path: string, session = superAdmin) {
      const agent = request(server(app));
      const pending =
        method === 'post'
          ? agent.post(path)
          : method === 'put'
            ? agent.put(path)
            : agent.delete(path);
      return pending
        .set('Cookie', session.accessCookie)
        .set('Origin', allowedOrigin)
        .set('Sec-Fetch-Site', 'same-origin')
        .set('X-CSRF-Token', session.csrfToken);
    }

    function upload(productId: string, bytes: Buffer, type: string, version: number) {
      return mutation('post', `/api/v1/admin/catalog/products/${productId}/images`)
        .field('imageVersion', String(version))
        .attach('file', bytes, { filename: '../../untrusted-name', contentType: type });
    }

    function replace(imageId: string, bytes: Buffer, type: string, version: number) {
      return mutation('post', `/api/v1/admin/catalog/product-images/${imageId}/replacements`)
        .field('imageVersion', String(version))
        .attach('file', bytes, { filename: 'replacement', contentType: type });
    }

    async function createProduct(status: 'ARCHIVED' | 'DRAFT' = 'DRAFT'): Promise<string> {
      const category = await prisma.category.create({
        data: { name: `Image Category ${randomUUID()}`, nameKey: randomUUID() },
      });
      const product = await prisma.product.create({
        data: {
          name: 'Image Product',
          description: 'Complete product description',
          categoryId: category.id,
          status,
          variants: {
            create: {
              sku: `IMAGE-${randomUUID().toUpperCase()}`,
              priceRial: 1000,
              inventory: { create: { onHandQuantity: 1 } },
            },
          },
        },
      });
      return product.id;
    }

    async function objectNames(): Promise<string[]> {
      try {
        return await readdir(join(storageRoot, 'objects'));
      } catch (error) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          (error as { code?: unknown }).code === 'ENOENT'
        ) {
          return [];
        }
        throw error;
      }
    }

    void before(async () => {
      assert.ok(testDatabaseUrl);
      storageRoot = await mkdtemp(join(tmpdir(), 'product-image-http-'));
      const environment = createTestEnvironment('test', {
        DATABASE_URL: testDatabaseUrl,
        PRODUCT_IMAGE_STORAGE_ROOT: storageRoot,
      });
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule.forRoot(environment)],
      }).compile();
      app = moduleRef.createNestApplication({ logger: false });
      configureApplication(app, environment);
      await app.init();
      prisma = moduleRef.get(PrismaService);
      loginSecurity = moduleRef.get(LoginSecurity);
      [png, jpeg, webp] = await Promise.all([
        sharp({ create: { width: 4, height: 3, channels: 3, background: '#334455' } })
          .png()
          .toBuffer(),
        sharp({ create: { width: 5, height: 2, channels: 3, background: '#445566' } })
          .jpeg()
          .toBuffer(),
        sharp({ create: { width: 2, height: 6, channels: 3, background: '#556677' } })
          .webp()
          .toBuffer(),
      ]);
      await clearAll();
      superAdmin = await createSession();
    });

    void beforeEach(clearCatalog);

    void after(async () => {
      await clearAll();
      await app.close();
      await rm(storageRoot, { recursive: true, force: true });
    });

    void test('appends a main image, serves protected content, and filters public eligibility', async () => {
      const productId = await createProduct();
      const uploaded = await upload(productId, png, 'image/png', 1).expect(201);
      const collection = body<CollectionBody>(uploaded);
      assert.equal(collection.imageVersion, 2);
      assert.deepEqual(
        collection.images.map(({ mediaType, width, height, position }) => ({
          mediaType,
          width,
          height,
          position,
        })),
        [{ mediaType: 'PNG', width: 4, height: 3, position: 0 }],
      );
      assert.equal((await objectNames()).length, 1);
      const imageId = collection.images[0]?.id ?? '';

      const protectedContent = await request(server(app))
        .get(`/api/v1/admin/catalog/product-images/${imageId}/content`)
        .set('Cookie', superAdmin.accessCookie)
        .buffer(true)
        .expect(200)
        .expect('Content-Type', 'image/png')
        .expect('X-Content-Type-Options', 'nosniff')
        .expect('Cache-Control', 'private, no-store');
      assert.deepEqual(protectedContent.body, png);
      assert.match(
        String(protectedContent.headers['content-disposition']),
        /^inline; filename="[0-9a-f-]+\.png"$/u,
      );
      await request(server(app))
        .get(`/api/v1/catalog/product-images/${imageId}/content`)
        .expect(404)
        .expect((response: Response) =>
          assert.equal(body<ErrorBody>(response).code, 'PRODUCT_IMAGE_NOT_FOUND'),
        );

      await prisma.product.update({ where: { id: productId }, data: { status: 'ACTIVE' } });
      const publicContent = await request(server(app))
        .get(`/api/v1/catalog/product-images/${imageId}/content`)
        .expect(200)
        .expect('Cache-Control', 'public, max-age=31536000, immutable')
        .expect('X-Content-Type-Options', 'nosniff');
      assert.deepEqual(publicContent.body, png);
      assert.equal(JSON.stringify(collection).includes('storageKey'), false);
    });

    void test('atomically reorders, replaces identity, compacts deletion, and rejects stale races', async () => {
      const productId = await createProduct();
      const first = body<CollectionBody>(await upload(productId, png, 'image/png', 1).expect(201));
      const second = body<CollectionBody>(
        await upload(productId, jpeg, 'image/jpeg', 2).expect(201),
      );
      const ids = second.images.map(({ id }) => id);
      const race = await Promise.all([
        mutation('put', `/api/v1/admin/catalog/products/${productId}/images/order`).send({
          imageIds: [...ids].reverse(),
          imageVersion: 3,
        }),
        mutation('put', `/api/v1/admin/catalog/products/${productId}/images/order`).send({
          imageIds: ids,
          imageVersion: 3,
        }),
      ]);
      assert.deepEqual(race.map(({ status }) => status).sort(), [200, 409]);
      const winner = body<CollectionBody>(race.find(({ status }) => status === 200) as Response);
      assert.equal(winner.imageVersion, 4);
      assert.deepEqual(
        winner.images.map(({ position }) => position),
        [0, 1],
      );

      const target = winner.images[1];
      assert.ok(target);
      const replaced = body<CollectionBody>(
        await replace(target.id, webp, 'image/webp', 4).expect(201),
      );
      assert.equal(replaced.imageVersion, 5);
      assert.equal(replaced.images[1]?.position, 1);
      assert.equal(replaced.images[1]?.mediaType, 'WEBP');
      assert.notEqual(replaced.images[1]?.id, target.id);
      assert.equal(await prisma.productImage.findUnique({ where: { id: target.id } }), null);
      assert.equal(await prisma.productImageCleanup.count(), 0);
      assert.equal((await objectNames()).length, 2);

      await mutation(
        'delete',
        `/api/v1/admin/catalog/product-images/${replaced.images[0]?.id ?? ''}?imageVersion=5`,
      ).expect(204);
      const stored = await prisma.product.findUniqueOrThrow({
        where: { id: productId },
        select: { imageVersion: true, images: { orderBy: { position: 'asc' } } },
      });
      assert.equal(stored.imageVersion, 6);
      assert.deepEqual(
        stored.images.map(({ position }) => position),
        [0],
      );
      assert.equal((await objectNames()).length, 1);
      assert.equal(first.images.length, 1);
    });

    void test('enforces lifecycle, exact membership, limits, and unsafe-input compensation', async () => {
      const productId = await createProduct();
      let version = 1;
      let latest: CollectionBody | undefined;
      for (let index = 0; index < 9; index += 1) {
        latest = body<CollectionBody>(
          await upload(productId, png, 'image/png', version).expect(201),
        );
        version = latest.imageVersion;
      }
      assert.equal(latest?.images.length, 9);
      await upload(productId, png, 'image/png', version)
        .expect(409)
        .expect((response: Response) =>
          assert.equal(body<ErrorBody>(response).code, 'PRODUCT_IMAGE_LIMIT_REACHED'),
        );
      assert.equal((await objectNames()).length, 9);

      await mutation('put', `/api/v1/admin/catalog/products/${productId}/images/order`)
        .send({ imageIds: latest?.images.slice(0, 8).map(({ id }) => id), imageVersion: version })
        .expect(409)
        .expect((response: Response) =>
          assert.equal(body<ErrorBody>(response).code, 'PRODUCT_IMAGE_ORDER_CONFLICT'),
        );

      await prisma.product.update({ where: { id: productId }, data: { status: 'ACTIVE' } });
      await mutation(
        'delete',
        `/api/v1/admin/catalog/product-images/${latest?.images[0]?.id ?? ''}?imageVersion=${version}`,
      )
        .expect(409)
        .expect((response: Response) =>
          assert.equal(body<ErrorBody>(response).code, 'PRODUCT_MAIN_IMAGE_REQUIRED'),
        );
      await prisma.product.update({ where: { id: productId }, data: { status: 'ARCHIVED' } });
      await replace(latest?.images[1]?.id ?? '', jpeg, 'image/jpeg', version)
        .expect(409)
        .expect((response: Response) =>
          assert.equal(body<ErrorBody>(response).code, 'PRODUCT_LIFECYCLE_CONFLICT'),
        );
      assert.equal((await objectNames()).length, 9);

      const invalidProduct = await createProduct();
      await upload(invalidProduct, Buffer.from('<svg/>'), 'image/svg+xml', 1)
        .expect(415)
        .expect((response: Response) =>
          assert.equal(body<ErrorBody>(response).code, 'PRODUCT_IMAGE_TYPE_UNSUPPORTED'),
        );
      await upload(invalidProduct, Buffer.concat([png, Buffer.from('tail')]), 'image/png', 1)
        .expect(422)
        .expect((response: Response) =>
          assert.equal(body<ErrorBody>(response).code, 'PRODUCT_IMAGE_CONTENT_INVALID'),
        );
      await upload(invalidProduct, Buffer.alloc(409_600), 'image/png', 1)
        .expect(413)
        .expect((response: Response) =>
          assert.equal(body<ErrorBody>(response).code, 'PRODUCT_IMAGE_TOO_LARGE'),
        );
      assert.equal(await prisma.productImage.count({ where: { productId: invalidProduct } }), 0);
    });

    void test('enforces authentication, exact mutation permission, and CSRF', async () => {
      const productId = await createProduct();
      await request(server(app))
        .post(`/api/v1/admin/catalog/products/${productId}/images`)
        .field('imageVersion', '1')
        .attach('file', png, { filename: 'x.png', contentType: 'image/png' })
        .expect(401);

      const wrongPermissions = await prisma.permission.findMany({
        where: { code: { in: ['admin.access', 'catalog.manage'] } },
        select: { id: true },
      });
      const role = await prisma.role.create({
        data: {
          code: 'TEST_IMAGE_NO_MEDIA',
          permissions: { create: wrongPermissions.map(({ id }) => ({ permissionId: id })) },
        },
      });
      assert.ok(role.id);
      const insufficient = await createSession('TEST_IMAGE_NO_MEDIA');
      await upload(productId, png, 'image/png', 1)
        .set('Cookie', insufficient.accessCookie)
        .set('X-CSRF-Token', insufficient.csrfToken)
        .expect(403)
        .expect((response: Response) =>
          assert.equal(body<ErrorBody>(response).code, 'INSUFFICIENT_PERMISSION'),
        );

      await request(server(app))
        .post(`/api/v1/admin/catalog/products/${productId}/images`)
        .set('Cookie', superAdmin.accessCookie)
        .set('Origin', allowedOrigin)
        .set('Sec-Fetch-Site', 'same-origin')
        .field('imageVersion', '1')
        .attach('file', png, { filename: 'x.png', contentType: 'image/png' })
        .expect(403)
        .expect((response: Response) =>
          assert.equal(body<ErrorBody>(response).code, 'CSRF_VALIDATION_FAILED'),
        );
      assert.equal(await prisma.productImage.count(), 0);
      assert.equal((await objectNames()).length, 0);
    });

    void test('publishes protected/public multipart, content, security, and failure contracts', async () => {
      const response = await request(server(app)).get('/api/docs-json').expect(200);
      const document = body<OpenApiDocument>(response);
      const paths = document.paths;
      const uploadOperation = paths['/api/v1/admin/catalog/products/{productId}/images']?.post;
      const orderOperation = paths['/api/v1/admin/catalog/products/{productId}/images/order']?.put;
      const replacement =
        paths['/api/v1/admin/catalog/product-images/{imageId}/replacements']?.post;
      const removal = paths['/api/v1/admin/catalog/product-images/{imageId}']?.delete;
      const protectedContent = paths['/api/v1/admin/catalog/product-images/{imageId}/content']?.get;
      const publicContent = paths['/api/v1/catalog/product-images/{imageId}/content']?.get;
      for (const operation of [
        uploadOperation,
        orderOperation,
        replacement,
        removal,
        protectedContent,
        publicContent,
      ]) {
        assert.ok(operation);
      }
      for (const operation of [uploadOperation, orderOperation, replacement, removal]) {
        assert.deepEqual(operation?.security, [{ adminAccess: [] }]);
        assert.ok(
          operation?.parameters?.some(
            ({ name, in: location }) => name === 'X-CSRF-Token' && location === 'header',
          ),
        );
      }
      assert.deepEqual(protectedContent?.security, [{ adminAccess: [] }]);
      assert.equal(publicContent?.security, undefined);
      assert.match(JSON.stringify(uploadOperation?.requestBody), /multipart\/form-data/u);
      assert.match(JSON.stringify(replacement?.requestBody), /multipart\/form-data/u);
      assert.deepEqual(Object.keys(uploadOperation?.responses ?? {}).sort(), [
        '201',
        '400',
        '401',
        '403',
        '404',
        '409',
        '413',
        '415',
        '422',
        '500',
        '503',
      ]);
      assert.deepEqual(Object.keys(publicContent?.responses ?? {}).sort(), [
        '200',
        '400',
        '404',
        '500',
        '503',
      ]);
    });
  },
);
