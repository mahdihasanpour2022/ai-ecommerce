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

interface CategoryBody {
  readonly id: string;
  readonly name: string;
  readonly parentId: string | null;
  readonly level: number;
  readonly children: CategoryBody[];
}

interface ErrorBody {
  readonly code: string;
}

interface OpenApiOperation {
  readonly security?: Array<Record<string, unknown>>;
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
  return response.body as T;
}

function cookiePair(cookies: readonly string[], name: string): string {
  const cookie = cookies.find((candidate) => candidate.startsWith(`${name}=`));
  assert.ok(cookie);
  return cookie.slice(0, cookie.indexOf(';'));
}

void describe(
  'protected Admin Category PostgreSQL and HTTP contract',
  { skip: testDatabaseUrl === undefined, concurrency: 1 },
  () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let loginSecurity: LoginSecurity;

    async function clearState(): Promise<void> {
      await prisma.$transaction(async (transaction) => {
        await transaction.productImage.deleteMany();
        await transaction.inventory.deleteMany();
        await transaction.productVariant.deleteMany();
        await transaction.product.deleteMany();
        await transaction.category.deleteMany();
      });
      await prisma.authSession.deleteMany();
      await prisma.adminLoginThrottle.deleteMany();
      await prisma.adminUser.deleteMany();
      await prisma.role.deleteMany({ where: { code: { startsWith: 'TEST_' } } });
      loginSecurity.resetForTests();
    }

    async function createSession(roleCode = 'SUPER_ADMIN'): Promise<SessionHeaders> {
      const role = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });
      const password = '654321';
      const email = `category-${randomUUID()}@example.invalid`;
      await prisma.adminUser.create({
        data: {
          email,
          username: `u_${randomUUID().replaceAll('-', '').slice(0, 18)}`,
          displayName: 'Category Contract Admin',
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
      session: SessionHeaders,
    ): request.Test {
      const agent = request(server(app));
      const pending =
        method === 'post'
          ? agent.post(path)
          : method === 'patch'
            ? agent.patch(path)
            : agent.delete(path);
      return pending
        .set('Cookie', session.accessCookie)
        .set('Origin', allowedOrigin)
        .set('Sec-Fetch-Site', 'same-origin')
        .set('X-CSRF-Token', session.csrfToken);
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
    });

    void beforeEach(clearState);

    void after(async () => {
      await clearState();
      await app.close();
    });

    void test('creates, returns, renames, moves, and deletes normalized Categories', async () => {
      const session = await createSession();
      const root = await mutation('post', '/api/v1/admin/catalog/categories', session)
        .send({ name: '  پوشاک   زنانه  ' })
        .expect(201)
        .expect('Cache-Control', 'no-store');
      const rootBody = responseBody<CategoryBody>(root);
      assert.equal(rootBody.name, 'پوشاک زنانه');
      assert.equal(rootBody.parentId, null);
      assert.equal(rootBody.level, 1);
      assert.deepEqual(rootBody.children, []);
      assert.equal('nameKey' in rootBody, false);

      const child = await mutation('post', '/api/v1/admin/catalog/categories', session)
        .send({ name: 'مانتو', parentId: rootBody.id })
        .expect(201);
      const childBody = responseBody<CategoryBody>(child);
      assert.equal(childBody.level, 2);

      const tree = await request(server(app))
        .get('/api/v1/admin/catalog/categories')
        .set('Cookie', session.accessCookie)
        .expect(200)
        .expect('Cache-Control', 'no-store');
      const treeBody = responseBody<CategoryBody[]>(tree);
      assert.equal(treeBody.length, 1);
      assert.equal(treeBody[0]?.children[0]?.id, childBody.id);

      const moved = await mutation(
        'patch',
        `/api/v1/admin/catalog/categories/${childBody.id}`,
        session,
      )
        .send({ name: '  مانتوهای   زنانه ', parentId: null })
        .expect(200);
      const movedBody = responseBody<CategoryBody>(moved);
      assert.equal(movedBody.name, 'مانتوهای زنانه');
      assert.equal(movedBody.parentId, null);
      assert.equal(movedBody.level, 1);

      await mutation('delete', `/api/v1/admin/catalog/categories/${childBody.id}`, session).expect(
        204,
      );
      assert.equal(await prisma.category.count(), 1);
    });

    void test('rejects malformed input, sibling conflicts, invalid moves, and missing parents', async () => {
      const session = await createSession();
      const root = await mutation('post', '/api/v1/admin/catalog/categories', session)
        .send({ name: 'Root' })
        .expect(201);
      const rootBody = responseBody<CategoryBody>(root);

      await mutation('post', '/api/v1/admin/catalog/categories', session)
        .send({ name: 'ＲＯＯＴ' })
        .expect(409)
        .expect((response: Response) =>
          assert.equal(responseBody<ErrorBody>(response).code, 'CATEGORY_NAME_CONFLICT'),
        );
      await mutation('post', '/api/v1/admin/catalog/categories', session)
        .send({ name: 'Other', parentId: randomUUID(), extra: true })
        .expect(400)
        .expect((response: Response) =>
          assert.equal(responseBody<ErrorBody>(response).code, 'VALIDATION_FAILED'),
        );
      await mutation('post', '/api/v1/admin/catalog/categories', session)
        .send({ name: 'Other', parentId: randomUUID() })
        .expect(404)
        .expect((response: Response) =>
          assert.equal(responseBody<ErrorBody>(response).code, 'CATEGORY_NOT_FOUND'),
        );
      await mutation('patch', `/api/v1/admin/catalog/categories/${rootBody.id}`, session)
        .send({})
        .expect(400);
      await mutation('patch', `/api/v1/admin/catalog/categories/${rootBody.id}`, session)
        .send({ parentId: rootBody.id })
        .expect(409)
        .expect((response: Response) =>
          assert.equal(responseBody<ErrorBody>(response).code, 'CATEGORY_MOVE_INVALID'),
        );
      await mutation('patch', '/api/v1/admin/catalog/categories/NOT-A-UUID', session)
        .send({ name: 'Nope' })
        .expect(400);
    });

    void test('enforces six levels, subtree overflow, and restrictive deletion', async () => {
      const session = await createSession();
      let parentId: string | null = null;
      const ids: string[] = [];
      for (let level = 1; level <= 6; level += 1) {
        const response: Response = await mutation(
          'post',
          '/api/v1/admin/catalog/categories',
          session,
        )
          .send({ name: `Level ${level}`, parentId })
          .expect(201);
        const category: CategoryBody = responseBody<CategoryBody>(response);
        ids.push(category.id);
        parentId = category.id;
      }
      await mutation('post', '/api/v1/admin/catalog/categories', session)
        .send({ name: 'Level 7', parentId })
        .expect(409)
        .expect((response: Response) =>
          assert.equal(responseBody<ErrorBody>(response).code, 'CATEGORY_MOVE_INVALID'),
        );
      await mutation('patch', `/api/v1/admin/catalog/categories/${ids[0]}`, session)
        .send({ parentId: ids[5] })
        .expect(409);
      await mutation('delete', `/api/v1/admin/catalog/categories/${ids[0]}`, session)
        .expect(409)
        .expect((response: Response) =>
          assert.equal(responseBody<ErrorBody>(response).code, 'CATEGORY_NOT_EMPTY'),
        );

      await prisma.$transaction(async (transaction) => {
        const productId = randomUUID();
        const variantId = randomUUID();
        await transaction.product.create({
          data: { id: productId, name: 'Referenced Product', categoryId: ids[5] as string },
        });
        await transaction.productVariant.create({
          data: {
            id: variantId,
            productId,
            sku: `CATEGORY-${variantId}`.toUpperCase(),
            priceRial: 1000n,
          },
        });
        await transaction.inventory.create({ data: { variantId } });
      });
      await mutation('delete', `/api/v1/admin/catalog/categories/${ids[5]}`, session)
        .expect(409)
        .expect((response: Response) =>
          assert.equal(responseBody<ErrorBody>(response).code, 'CATEGORY_NOT_EMPTY'),
        );
    });

    void test('enforces authentication, exact permission, and session CSRF', async () => {
      await request(server(app)).get('/api/v1/admin/catalog/categories').expect(401);

      const adminAccess = await prisma.permission.findUniqueOrThrow({
        where: { code: 'admin.access' },
      });
      await prisma.role.create({
        data: {
          code: 'TEST_CATEGORY_NO_ACCESS',
          permissions: { create: { permissionId: adminAccess.id } },
        },
      });
      const insufficient = await createSession('TEST_CATEGORY_NO_ACCESS');
      await request(server(app))
        .get('/api/v1/admin/catalog/categories')
        .set('Cookie', insufficient.accessCookie)
        .expect(403)
        .expect((response: Response) =>
          assert.equal(responseBody<ErrorBody>(response).code, 'INSUFFICIENT_PERMISSION'),
        );

      const session = await createSession();
      await request(server(app))
        .post('/api/v1/admin/catalog/categories')
        .set('Cookie', session.accessCookie)
        .set('Origin', allowedOrigin)
        .set('Sec-Fetch-Site', 'same-origin')
        .send({ name: 'Missing CSRF' })
        .expect(403)
        .expect((response: Response) =>
          assert.equal(responseBody<ErrorBody>(response).code, 'CSRF_VALIDATION_FAILED'),
        );
    });

    void test('maps the 1,000-Category cap and concurrent sibling race to stable conflicts', async () => {
      const session = await createSession();
      const outcomes = await Promise.all([
        mutation('post', '/api/v1/admin/catalog/categories', session).send({ name: 'Race Name' }),
        mutation('post', '/api/v1/admin/catalog/categories', session).send({
          name: 'Ｒａｃｅ Name',
        }),
      ]);
      assert.deepEqual(outcomes.map(({ status }) => status).sort(), [201, 409]);
      await prisma.category.deleteMany();
      await prisma.category.createMany({
        data: Array.from({ length: 1000 }, (_, index) => ({
          id: randomUUID(),
          name: `Cap ${index}`,
          nameKey: `cap ${index}`,
        })),
      });
      await mutation('post', '/api/v1/admin/catalog/categories', session)
        .send({ name: 'Overflow' })
        .expect(409)
        .expect((response: Response) =>
          assert.equal(responseBody<ErrorBody>(response).code, 'CATEGORY_LIMIT_REACHED'),
        );
    });

    void test('publishes exact protected Category OpenAPI and CORS methods', async () => {
      const document = await request(server(app)).get('/api/docs-json').expect(200);
      const openApi = responseBody<OpenApiDocument>(document);
      const paths = openApi.paths;
      const collection = paths['/api/v1/admin/catalog/categories'];
      const member = paths['/api/v1/admin/catalog/categories/{categoryId}'];
      assert.ok(collection?.get);
      assert.ok(collection?.post);
      assert.ok(member?.patch);
      assert.ok(member?.delete);
      for (const operation of [collection.get, collection.post, member.patch, member.delete]) {
        assert.deepEqual(operation?.security, [{ adminAccess: [] }]);
      }
      assert.ok(openApi.components.schemas.CategoryResponseDto);
      assert.ok(openApi.components.schemas.CreateCategoryRequestDto);
      assert.ok(openApi.components.schemas.UpdateCategoryRequestDto);

      const cors = await request(server(app))
        .options('/api/v1/admin/catalog/categories/example')
        .set('Origin', allowedOrigin)
        .set('Access-Control-Request-Method', 'PATCH')
        .expect(204);
      assert.match(cors.headers['access-control-allow-methods'] as string, /PATCH/u);
      assert.match(cors.headers['access-control-allow-methods'] as string, /DELETE/u);
    });
  },
);
