import assert from 'node:assert/strict';
import { randomInt, randomUUID } from 'node:crypto';
import { after, before, beforeEach, describe, test } from 'node:test';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Response } from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module.js';
import { configureApplication } from '../src/application.js';
import {
  CUSTOMER_ACCESS_COOKIE_NAME,
  CUSTOMER_AUTHENTICATION_REQUIRED_MESSAGE,
  CUSTOMER_CSRF_VALIDATION_FAILED_MESSAGE,
} from '../src/customer-authentication/customer-authentication.constants.js';
import { CustomerSessionCrypto } from '../src/customer-authentication/customer-session.crypto.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { createTestEnvironment } from './test-environment.js';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const allowedOrigin = 'http://localhost:3001';
const favoriteFetchedMessage = 'لیست علاقه‌مندی‌های شما با موفقیت دریافت شد.';
const favoriteAddedMessage = 'محصول با موفقیت به لیست علاقه‌مندی‌های شما اضافه شد.';
const favoriteRemovedMessage = 'محصول با موفقیت از لیست علاقه‌مندی‌های شما حذف شد.';
const validationFailedMessage = 'اطلاعات درخواست معتبر نیست.';
const productNotFoundMessage = 'محصول مورد نظر یافت نشد.';

interface ErrorEnvelope {
  readonly statusCode: number;
  readonly hasError: true;
  readonly code: string;
  readonly message: string;
  readonly details: readonly string[];
}

interface ProductSummary {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: { readonly id: string; readonly name: string };
  readonly image: string;
  readonly alt: string;
  readonly original_price: number;
  readonly final_price: number;
  readonly discount: number;
  readonly currency: 'IRR' | 'IRT';
  readonly quantity: number;
  readonly isAvailable: boolean;
}

interface FavoritePageEnvelope {
  readonly statusCode: 200;
  readonly hasError: false;
  readonly code: 'FAVORITES_FETCHED';
  readonly message: string;
  readonly count: number;
  readonly result: readonly ProductSummary[];
  readonly singleResult: null;
  readonly details: null;
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
}

interface FavoriteMutationEnvelope {
  readonly statusCode: 200;
  readonly hasError: false;
  readonly code: 'FAVORITE_PRODUCT_ADDED' | 'FAVORITE_PRODUCT_REMOVED';
  readonly message: string;
  readonly count: 0;
  readonly result: null;
  readonly singleResult: { readonly productId: string; readonly isFavorite: boolean };
  readonly details: null;
}

interface CustomerCredential {
  readonly id: string;
  readonly accessCookie: string;
  readonly csrfToken: string;
}

interface OpenApiOperation {
  readonly security?: Array<Record<string, readonly unknown[]>>;
  readonly parameters?: ReadonlyArray<{ readonly name?: string; readonly in?: string }>;
  readonly responses?: Record<string, unknown>;
}

function server(app: INestApplication): App {
  return app.getHttpServer() as App;
}

function responseBody<T>(response: { readonly body: unknown }): T {
  return response.body as T;
}

// خطاهای عمومی Favorite را با کد و پیام پایدار و بدون افشای جزئیات داخلی تثبیت می‌کند.
function assertError(
  response: Response,
  expected: { readonly statusCode: number; readonly code: string; readonly message: string },
): void {
  const body = responseBody<ErrorEnvelope>(response);
  assert.equal(body.statusCode, expected.statusCode);
  assert.equal(body.hasError, true);
  assert.equal(body.code, expected.code);
  assert.equal(body.message, expected.message);
  assert.deepEqual(body.details, []);
}

void describe(
  'Favorite PostgreSQL and HTTP acceptance contracts',
  { skip: testDatabaseUrl === undefined, concurrency: 1 },
  () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let sessionCrypto: CustomerSessionCrypto;

    // داده‌های هر سناریو را فقط از مرزهای متعلق به Favorite و Catalog پاک می‌کند.
    async function cleanup(): Promise<void> {
      await prisma.customerAuthSessionRefreshThrottle.deleteMany();
      await prisma.customerRefreshToken.deleteMany();
      await prisma.customerAuthSession.deleteMany();
      await prisma.customer.deleteMany();
      // حذف اجزای Product فعال در یک تراکنش انجام می‌شود تا constraint کامل‌بودن در وضعیت میانی نقض نشود.
      await prisma.$transaction(async (transaction) => {
        await transaction.productImage.deleteMany();
        await transaction.inventory.deleteMany();
        await transaction.productVariant.deleteMany();
        await transaction.product.deleteMany();
        await transaction.category.deleteMany();
      });
    }

    // نشست واقعی Customer را بدون عبور غیرضروری از جریان OTP برای آزمون مرز HTTP می‌سازد.
    async function customer(): Promise<CustomerCredential> {
      const suffix = randomInt(100_000_000, 1_000_000_000);
      const created = await prisma.customer.create({
        data: {
          mobile: `+989${suffix}`,
          firstName: 'علی',
          lastName: 'احمدی',
        },
        select: { id: true },
      });
      const credentials = await sessionCrypto.issue(created.id, new Date());
      await prisma.customerAuthSession.create({
        data: {
          id: credentials.sessionId,
          customerId: created.id,
          csrfTokenHash: credentials.csrfTokenHash,
          expiresAt: credentials.sessionExpiresAt,
        },
      });
      return {
        id: created.id,
        accessCookie: `${CUSTOMER_ACCESS_COOKIE_NAME}=${credentials.accessToken}`,
        csrfToken: credentials.csrfToken,
      };
    }

    // یک Product کامل می‌سازد تا رفتار Active و غیر Active مستقل از fixtureهای دیگر سنجیده شود.
    async function product(
      status: 'ACTIVE' | 'ARCHIVED' | 'DRAFT' = 'ACTIVE',
      name = `Favorite Product ${randomUUID()}`,
    ): Promise<string> {
      const categoryName = `Favorite Category ${randomUUID()}`;
      const category = await prisma.category.create({
        data: { name: categoryName, nameKey: categoryName.toLowerCase() },
        select: { id: true },
      });
      const created = await prisma.product.create({
        data: {
          name,
          description: 'توضیح محصول علاقه‌مندی',
          originalPriceRial: 10_000,
          discountPercent: 10,
          categoryId: category.id,
          variants: {
            create: {
              sku: `FAVORITE-${randomUUID().toUpperCase()}`,
              size: 'M',
              sizeKey: 'm',
              isActive: true,
              inventory: { create: { onHandQuantity: 3 } },
            },
          },
        },
        select: { id: true },
      });
      await prisma.productImage.create({
        data: {
          productId: created.id,
          storageKey: `favorite-tests/${created.id}.png`,
          mediaType: 'PNG',
          byteSize: 1,
          width: 1,
          height: 1,
          position: 0,
        },
      });
      if (status !== 'DRAFT') {
        await prisma.product.update({ where: { id: created.id }, data: { status } });
      }
      return created.id;
    }

    // درخواست تغییردهنده را به Access، مبدأ مجاز و CSRF همان نشست مقید می‌کند.
    function addFavorite(
      credential: CustomerCredential,
      productId: string,
      csrfToken = credential.csrfToken,
    ) {
      return request(server(app))
        .post(`/api/v1/favorite/${productId}`)
        .set('Cookie', credential.accessCookie)
        .set('Origin', allowedOrigin)
        .set('Sec-Fetch-Site', 'same-origin')
        .set('X-CSRF-Token', csrfToken);
    }

    // حذف را با همان مرز امنیتی POST اجرا می‌کند تا تفاوت ناخواسته‌ای در قرارداد ایجاد نشود.
    function removeFavorite(
      credential: CustomerCredential,
      productId: string,
      csrfToken = credential.csrfToken,
    ) {
      return request(server(app))
        .delete(`/api/v1/favorite/${productId}`)
        .set('Cookie', credential.accessCookie)
        .set('Origin', allowedOrigin)
        .set('Sec-Fetch-Site', 'same-origin')
        .set('X-CSRF-Token', csrfToken);
    }

    void before(async () => {
      const environment = createTestEnvironment('test', { DATABASE_URL: testDatabaseUrl });
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule.forRoot(environment)],
      }).compile();
      app = moduleRef.createNestApplication({ logger: false });
      configureApplication(app, environment);
      await app.init();
      prisma = moduleRef.get(PrismaService);
      sessionCrypto = moduleRef.get(CustomerSessionCrypto);
      await cleanup();
    });

    void beforeEach(cleanup);

    void after(async () => {
      await cleanup();
      await app.close();
    });

    void test('requires Customer authentication and CSRF on every protected operation', async () => {
      const productId = randomUUID();
      for (const response of [
        await request(server(app)).get('/api/v1/favorite'),
        await request(server(app)).post(`/api/v1/favorite/${productId}`),
        await request(server(app)).delete(`/api/v1/favorite/${productId}`),
      ]) {
        assert.equal(response.status, 401);
        assertError(response, {
          statusCode: 401,
          code: 'AUTHENTICATION_REQUIRED',
          message: CUSTOMER_AUTHENTICATION_REQUIRED_MESSAGE,
        });
      }

      const credential = await customer();
      for (const response of [
        await addFavorite(credential, productId, 'invalid'),
        await removeFavorite(credential, productId, 'invalid'),
      ]) {
        assert.equal(response.status, 403);
        assertError(response, {
          statusCode: 403,
          code: 'CSRF_VALIDATION_FAILED',
          message: CUSTOMER_CSRF_VALIDATION_FAILED_MESSAGE,
        });
      }
    });

    void test('validates pagination and hides missing or non-Active Product existence', async () => {
      const credential = await customer();
      for (const path of [
        '/api/v1/favorite?page=0',
        '/api/v1/favorite?pageSize=0',
        '/api/v1/favorite?pageSize=61',
      ]) {
        const response = await request(server(app))
          .get(path)
          .set('Cookie', credential.accessCookie)
          .expect(400);
        assertError(response, {
          statusCode: 400,
          code: 'VALIDATION_FAILED',
          message: validationFailedMessage,
        });
      }

      for (const mutation of [addFavorite, removeFavorite]) {
        const invalid = await mutation(credential, 'not-a-uuid').expect(400);
        assertError(invalid, {
          statusCode: 400,
          code: 'VALIDATION_FAILED',
          message: validationFailedMessage,
        });
      }

      const draftId = await product('DRAFT');
      const archivedId = await product('ARCHIVED');
      const failures = await Promise.all(
        [randomUUID(), draftId, archivedId].map((productId) =>
          addFavorite(credential, productId).expect(404),
        ),
      );
      for (const response of failures) {
        assertError(response, {
          statusCode: 404,
          code: 'PRODUCT_NOT_FOUND',
          message: productNotFoundMessage,
        });
      }
      const errorBodies = failures.map((response) => responseBody<ErrorEnvelope>(response));
      assert.deepEqual(errorBodies, [errorBodies[0], errorBodies[0], errorBodies[0]]);

      for (const productId of [randomUUID(), draftId, archivedId]) {
        const response = responseBody<FavoriteMutationEnvelope>(
          await removeFavorite(credential, productId).expect(200),
        );
        assert.deepEqual(response.singleResult, { productId, isFavorite: false });
        assert.equal(response.code, 'FAVORITE_PRODUCT_REMOVED');
        assert.equal(response.message, favoriteRemovedMessage);
      }
    });

    void test('adds idempotently and returns a deterministic bounded page of Active Products', async () => {
      const credential = await customer();
      const firstId = await product('ACTIVE', 'First Favorite Product');
      const secondId = await product('ACTIVE', 'Second Favorite Product');

      for (const productId of [firstId, secondId, firstId]) {
        const response = await addFavorite(credential, productId).expect(200);
        assert.deepEqual(responseBody<FavoriteMutationEnvelope>(response), {
          statusCode: 200,
          hasError: false,
          code: 'FAVORITE_PRODUCT_ADDED',
          message: favoriteAddedMessage,
          count: 0,
          result: null,
          singleResult: { productId, isFavorite: true },
          details: null,
        });
      }

      const tiedAt = new Date('2026-01-01T00:00:00.000Z');
      await prisma.$executeRaw`
        UPDATE customer_favorite_items
        SET created_at = ${tiedAt}
        WHERE customer_id = CAST(${credential.id} AS uuid)
      `;
      const expectedOrder = [firstId, secondId].sort().reverse();
      const firstPage = responseBody<FavoritePageEnvelope>(
        await request(server(app))
          .get('/api/v1/favorite?page=1&pageSize=1')
          .set('Cookie', credential.accessCookie)
          .expect(200),
      );
      const secondPage = responseBody<FavoritePageEnvelope>(
        await request(server(app))
          .get('/api/v1/favorite?page=2&pageSize=1')
          .set('Cookie', credential.accessCookie)
          .expect(200),
      );
      for (const page of [firstPage, secondPage]) {
        assert.equal(page.code, 'FAVORITES_FETCHED');
        assert.equal(page.message, favoriteFetchedMessage);
        assert.equal(page.count, 2);
        assert.equal(page.totalItems, 2);
        assert.equal(page.totalPages, 2);
        assert.equal(page.pageSize, 1);
        assert.equal(page.singleResult, null);
        assert.equal(page.details, null);
      }
      assert.deepEqual([firstPage.result[0]?.id, secondPage.result[0]?.id], expectedOrder);
      assert.deepEqual(Object.keys(firstPage.result[0] ?? {}).sort(), [
        'alt',
        'category',
        'currency',
        'description',
        'discount',
        'final_price',
        'id',
        'image',
        'isAvailable',
        'name',
        'original_price',
        'quantity',
      ]);

      await prisma.product.update({ where: { id: firstId }, data: { status: 'ARCHIVED' } });
      const activeOnly = responseBody<FavoritePageEnvelope>(
        await request(server(app))
          .get('/api/v1/favorite')
          .set('Cookie', credential.accessCookie)
          .expect(200),
      );
      assert.deepEqual(activeOnly.result.map(({ id }) => id), [secondId]);
      assert.equal(activeOnly.totalItems, 1);
    });

    void test('deletes idempotently without exposing or changing another Customer favorites', async () => {
      const owner = await customer();
      const other = await customer();
      const productId = await product();
      await addFavorite(owner, productId).expect(200);

      for (const credential of [other, owner, owner]) {
        const response = await removeFavorite(credential, productId).expect(200);
        assert.deepEqual(responseBody<FavoriteMutationEnvelope>(response), {
          statusCode: 200,
          hasError: false,
          code: 'FAVORITE_PRODUCT_REMOVED',
          message: favoriteRemovedMessage,
          count: 0,
          result: null,
          singleResult: { productId, isFavorite: false },
          details: null,
        });
        if (credential === other) {
          const ownerPage = responseBody<FavoritePageEnvelope>(
            await request(server(app))
              .get('/api/v1/favorite')
              .set('Cookie', owner.accessCookie)
              .expect(200),
          );
          assert.deepEqual(ownerPage.result.map(({ id }) => id), [productId]);
        }
      }
    });

    void test('personalizes Product detail for guest, owner, and another authenticated Customer', async () => {
      const owner = await customer();
      const other = await customer();
      const productId = await product();

      const guest = await request(server(app))
        .get(`/api/v1/catalog/products/${productId}`)
        .expect(200)
        .expect('Cache-Control', 'private, no-store');
      assert.equal(
        responseBody<{ readonly singleResult: { readonly isFavorite: boolean } }>(guest)
          .singleResult.isFavorite,
        false,
      );

      const withoutRecord = await request(server(app))
        .get(`/api/v1/catalog/products/${productId}`)
        .set('Cookie', owner.accessCookie)
        .expect(200)
        .expect('Cache-Control', 'private, no-store');
      assert.equal(
        responseBody<{ readonly singleResult: { readonly isFavorite: boolean } }>(withoutRecord)
          .singleResult.isFavorite,
        false,
      );

      await addFavorite(owner, productId).expect(200);
      const [favoriteDetail, isolated] = await Promise.all([
        request(server(app))
          .get(`/api/v1/catalog/products/${productId}`)
          .set('Cookie', owner.accessCookie)
          .expect(200),
        request(server(app))
          .get(`/api/v1/catalog/products/${productId}`)
          .set('Cookie', other.accessCookie)
          .expect(200),
      ]);
      assert.equal(
        responseBody<{ readonly singleResult: { readonly isFavorite: boolean } }>(favoriteDetail)
          .singleResult.isFavorite,
        true,
      );
      assert.equal(
        responseBody<{ readonly singleResult: { readonly isFavorite: boolean } }>(isolated)
          .singleResult.isFavorite,
        false,
      );
    });

    void test('publishes the authenticated Favorite and personalized Product contracts', async () => {
      const response = await request(server(app)).get('/api/docs-json').expect(200);
      const document = responseBody<{
        readonly paths: Record<
          string,
          { readonly get?: OpenApiOperation; readonly post?: OpenApiOperation; readonly delete?: OpenApiOperation }
        >;
        readonly components: { readonly schemas: Record<string, unknown> };
      }>(response);
      const list = document.paths['/api/v1/favorite']?.get;
      const add = document.paths['/api/v1/favorite/{productId}']?.post;
      const remove = document.paths['/api/v1/favorite/{productId}']?.delete;
      assert.ok(list);
      assert.ok(add);
      assert.ok(remove);
      assert.deepEqual(Object.keys(list.responses ?? {}).sort(), ['200', '400', '401', '500']);
      for (const operation of [add, remove]) {
        assert.deepEqual(Object.keys(operation.responses ?? {}).sort(), [
          '200',
          '400',
          '401',
          '403',
          '404',
          '500',
        ]);
        assert.ok(operation.parameters?.some(({ name }) => name === 'productId'));
        assert.ok(operation.parameters?.some(({ name }) => name === 'X-CSRF-Token'));
      }
      for (const operation of [list, add, remove]) {
        assert.deepEqual(operation.security, [{ customerAccess: [] }]);
      }
      assert.match(JSON.stringify(document.components.schemas), /PublicProductDetailDto[\s\S]*isFavorite/u);
    });
  },
);
