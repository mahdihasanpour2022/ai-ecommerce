import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
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
}

interface SettingBody {
  readonly unit: 'RIAL' | 'TOMAN';
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
        readonly properties?: Record<string, { readonly type?: string; readonly enum?: string[] }>;
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
  'catalog price display-setting PostgreSQL and HTTP contracts',
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
      await prisma.role.deleteMany({ where: { code: { startsWith: 'TEST_SETTING_' } } });
      await prisma.priceDisplaySetting.upsert({
        where: { id: 1 },
        create: { id: 1, unit: 'TOMAN' },
        update: { unit: 'TOMAN' },
      });
      loginSecurity.resetForTests();
    }

    async function createSession(roleCode = 'SUPER_ADMIN'): Promise<SessionHeaders> {
      const role = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });
      const password = randomBytes(32).toString('base64url');
      const email = `setting-${randomUUID()}@example.invalid`;
      const admin = await prisma.adminUser.create({
        data: {
          email,
          displayName: 'Price Setting Contract Admin',
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
        .send({ email, password })
        .expect(200);
      const session = await prisma.authSession.findFirstOrThrow({
        where: { adminUserId: admin.id },
        select: { id: true },
      });
      return {
        accessCookie: cookiePair(responseCookies(login), ACCESS_COOKIE_NAME),
        csrfToken: responseBody<{ csrfToken: string }>(login).csrfToken,
        adminUserId: admin.id,
        sessionId: session.id,
      };
    }

    function updateSetting(body: object, session = superAdmin): request.Test {
      return request(server(app))
        .put('/api/v1/admin/catalog/settings/price-display-unit')
        .set('Cookie', session.accessCookie)
        .set('Origin', allowedOrigin)
        .set('Sec-Fetch-Site', 'same-origin')
        .set('X-CSRF-Token', session.csrfToken)
        .send(body);
    }

    async function createCanonicalVariant(): Promise<string> {
      return prisma.$transaction(async (transaction) => {
        const category = await transaction.category.create({
          data: { name: 'Price setting test', nameKey: randomUUID() },
          select: { id: true },
        });
        const product = await transaction.product.create({
          data: { name: 'Canonical price product', categoryId: category.id },
          select: { id: true },
        });
        const variant = await transaction.productVariant.create({
          data: {
            productId: product.id,
            sku: `PRICE-${randomUUID()}`.toUpperCase(),
            size: null,
            sizeKey: null,
            color: null,
            colorKey: null,
            priceRial: 987_650n,
          },
          select: { id: true },
        });
        await transaction.inventory.create({ data: { variantId: variant.id } });
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

    void beforeEach(async () => {
      await clearCatalog();
      await prisma.priceDisplaySetting.update({ where: { id: 1 }, data: { unit: 'TOMAN' } });
    });

    void after(async () => {
      await clearAll();
      await app.close();
    });

    void test('returns the exact current Toman-default setting publicly and to Admin', async () => {
      const publicRead = await request(server(app))
        .get('/api/v1/catalog/settings/price-display-unit')
        .expect(200);
      assert.deepEqual(responseBody<SettingBody>(publicRead), { unit: 'TOMAN' });
      assert.deepEqual(Object.keys(responseBody<SettingBody>(publicRead)), ['unit']);

      const protectedRead = await request(server(app))
        .get('/api/v1/admin/catalog/settings/price-display-unit')
        .set('Cookie', superAdmin.accessCookie)
        .expect(200)
        .expect('Cache-Control', 'no-store');
      assert.deepEqual(responseBody<SettingBody>(protectedRead), { unit: 'TOMAN' });
    });

    void test('sets either unit and the same unit without changing canonical Variant prices', async () => {
      const variantId = await createCanonicalVariant();
      const original = await prisma.productVariant.findUniqueOrThrow({
        where: { id: variantId },
        select: { priceRial: true },
      });
      for (const unit of ['RIAL', 'RIAL', 'TOMAN'] as const) {
        const response = await updateSetting({ unit }).expect(200);
        assert.deepEqual(responseBody<SettingBody>(response), { unit });
        assert.deepEqual(Object.keys(responseBody<SettingBody>(response)), ['unit']);
      }
      assert.deepEqual(
        await prisma.productVariant.findUniqueOrThrow({
          where: { id: variantId },
          select: { priceRial: true },
        }),
        original,
      );
    });

    void test('rejects invalid bodies without changing the singleton', async () => {
      for (const body of [{}, { unit: 'rial' }, { unit: 'USD' }, { unit: 'RIAL', id: 1 }]) {
        await updateSetting(body)
          .expect(400)
          .expect((response: Response) =>
            assert.equal(responseBody<ErrorBody>(response).code, 'VALIDATION_FAILED'),
          );
      }
      assert.deepEqual(
        await prisma.priceDisplaySetting.findUniqueOrThrow({
          where: { id: 1 },
          select: { unit: true },
        }),
        { unit: 'TOMAN' },
      );
    });

    void test('enforces protected authentication, exact permissions, CSRF, and current state', async () => {
      await request(server(app))
        .get('/api/v1/admin/catalog/settings/price-display-unit')
        .expect(401);
      await request(server(app)).get('/api/v1/catalog/settings/price-display-unit').expect(200);

      const wrongPermissions = await prisma.permission.findMany({
        where: { code: { in: ['admin.access', 'catalog.read'] } },
        select: { id: true },
      });
      assert.equal(wrongPermissions.length, 2);
      await prisma.role.create({
        data: {
          code: 'TEST_SETTING_NO_ACCESS',
          permissions: { create: wrongPermissions.map(({ id }) => ({ permissionId: id })) },
        },
      });
      const insufficient = await createSession('TEST_SETTING_NO_ACCESS');
      await request(server(app))
        .get('/api/v1/admin/catalog/settings/price-display-unit')
        .set('Cookie', insufficient.accessCookie)
        .expect(200);
      await updateSetting({ unit: 'RIAL' }, insufficient)
        .expect(403)
        .expect((response: Response) =>
          assert.equal(responseBody<ErrorBody>(response).code, 'INSUFFICIENT_PERMISSION'),
        );

      await request(server(app))
        .put('/api/v1/admin/catalog/settings/price-display-unit')
        .set('Cookie', superAdmin.accessCookie)
        .set('Origin', allowedOrigin)
        .set('Sec-Fetch-Site', 'same-origin')
        .send({ unit: 'RIAL' })
        .expect(403)
        .expect((response: Response) =>
          assert.equal(responseBody<ErrorBody>(response).code, 'CSRF_VALIDATION_FAILED'),
        );

      await prisma.adminUser.update({
        where: { id: superAdmin.adminUserId },
        data: { disabledAt: new Date() },
      });
      await updateSetting({ unit: 'RIAL' })
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
      await updateSetting({ unit: 'RIAL' })
        .expect(401)
        .expect((response: Response) =>
          assert.equal(responseBody<ErrorBody>(response).code, 'AUTHENTICATION_REQUIRED'),
        );
    });

    void test('publishes exact protected and public OpenAPI contracts', async () => {
      const response = await request(server(app)).get('/api/docs-json').expect(200);
      const document = responseBody<OpenApiDocument>(response);
      const protectedPath = document.paths['/api/v1/admin/catalog/settings/price-display-unit'];
      const publicRead = document.paths['/api/v1/catalog/settings/price-display-unit']?.get;
      assert.ok(protectedPath?.get);
      assert.ok(protectedPath.put);
      assert.ok(publicRead);
      assert.deepEqual(protectedPath.get.security, [{ adminAccess: [] }]);
      assert.deepEqual(protectedPath.put.security, [{ adminAccess: [] }]);
      assert.equal(publicRead.security, undefined);
      assert.deepEqual(Object.keys(protectedPath.get.responses ?? {}).sort(), [
        '200',
        '401',
        '403',
        '500',
      ]);
      assert.deepEqual(Object.keys(protectedPath.put.responses ?? {}).sort(), [
        '200',
        '400',
        '401',
        '403',
        '500',
      ]);
      assert.deepEqual(Object.keys(publicRead.responses ?? {}).sort(), ['200', '500']);
      assert.deepEqual(protectedPath.get.parameters ?? [], []);
      assert.ok(
        protectedPath.put.parameters?.some(
          ({ name, in: location }) => name === 'X-CSRF-Token' && location === 'header',
        ),
      );
      assert.deepEqual(publicRead.parameters ?? [], []);
      assert.equal(
        protectedPath.put.requestBody?.content?.['application/json']?.schema?.$ref,
        '#/components/schemas/UpdatePriceDisplaySettingRequestDto',
      );
      const requestSchema = document.components.schemas.UpdatePriceDisplaySettingRequestDto;
      const responseSchema = document.components.schemas.PriceDisplaySettingResponseDto;
      for (const schema of [requestSchema, responseSchema]) {
        assert.deepEqual(schema?.required, ['unit']);
        assert.deepEqual(schema?.properties?.unit, {
          type: 'string',
          enum: ['RIAL', 'TOMAN'],
        });
      }
      assert.match(JSON.stringify(protectedPath.put), /settings\.price\.display\.unit\.update/u);
      assert.match(JSON.stringify(protectedPath.put), /VALIDATION_FAILED/u);
    });
  },
);
