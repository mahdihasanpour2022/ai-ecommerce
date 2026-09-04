import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, beforeEach, describe, test } from 'node:test';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import sharp from 'sharp';
import request from 'supertest';
import type { Response } from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module.js';
import { configureApplication } from '../src/application.js';
import { ProductImageStorage } from '../src/catalog/product-image.storage.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { createTestEnvironment } from './test-environment.js';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

interface ErrorBody {
  readonly statusCode: number;
  readonly code: string;
  readonly message: string;
  readonly details: string[];
}

interface PublicImageBody {
  readonly id: string;
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly mediaType: string;
}

interface PublicSummaryBody {
  readonly id: string;
  readonly name: string;
  readonly category: { readonly id: string; readonly name: string };
  readonly mainImage: PublicImageBody;
  readonly minimumPriceRial: number;
  readonly maximumPriceRial: number;
  readonly isAvailable: boolean;
}

interface PublicListBody {
  readonly items: PublicSummaryBody[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
}

interface PublicDetailBody extends PublicSummaryBody {
  readonly description: string;
  readonly categoryPath: Array<{ readonly id: string; readonly name: string }>;
  readonly images: PublicImageBody[];
  readonly variants: Array<{
    readonly id: string;
    readonly size: string | null;
    readonly color: string | null;
    readonly priceRial: number;
    readonly isAvailable: boolean;
  }>;
}

interface OpenApiOperation {
  readonly security?: Array<Record<string, unknown>>;
  readonly parameters?: Array<{ readonly name?: string; readonly in?: string }>;
  readonly responses?: Record<string, unknown>;
}

interface OpenApiDocument {
  readonly paths: Record<string, Record<string, OpenApiOperation | undefined>>;
  readonly components: { readonly schemas: Record<string, unknown> };
}

function server(app: INestApplication): App {
  return app.getHttpServer() as App;
}

function body<T>(response: Response): T {
  return response.body as T;
}

void describe(
  'minimum public catalog PostgreSQL and HTTP contracts',
  { skip: testDatabaseUrl === undefined, concurrency: 1 },
  () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let storage: ProductImageStorage;
    let storageRoot: string;
    let imageBytes: Buffer;

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

    async function category(name: string, parentId: string | null = null): Promise<string> {
      return (
        await prisma.category.create({
          data: { name, nameKey: name.toLowerCase(), parentId },
          select: { id: true },
        })
      ).id;
    }

    async function product(options: {
      readonly categoryId: string;
      readonly status?: 'ACTIVE' | 'ARCHIVED' | 'DRAFT';
      readonly createdAt?: Date;
      readonly name?: string;
      readonly variants?: ReadonlyArray<{
        readonly active: boolean;
        readonly price: number;
        readonly quantity: number;
        readonly size?: string;
        readonly color?: string;
      }>;
      readonly imageCount?: number;
    }): Promise<{
      readonly id: string;
      readonly imageIds: string[];
      readonly variantIds: string[];
    }> {
      const variants = options.variants ?? [{ active: true, price: 1000, quantity: 1, size: 'M' }];
      const created = await prisma.product.create({
        data: {
          name: options.name ?? `Product ${randomUUID()}`,
          description: 'Public plain-text description',
          categoryId: options.categoryId,
          ...(options.createdAt === undefined ? {} : { createdAt: options.createdAt }),
          variants: {
            create: variants.map((variant) => ({
              sku: `PUBLIC-${randomUUID().toUpperCase()}`,
              size: variant.size ?? null,
              sizeKey: variant.size?.toLowerCase() ?? null,
              color: variant.color ?? null,
              colorKey: variant.color?.toLowerCase() ?? null,
              priceRial: variant.price,
              isActive: variant.active,
              inventory: { create: { onHandQuantity: variant.quantity } },
            })),
          },
        },
        select: { id: true, variants: { select: { id: true }, orderBy: { id: 'asc' } } },
      });
      const variantIds = created.variants.map(({ id }) => id);
      const imageIds: string[] = [];
      for (let position = 0; position < (options.imageCount ?? 1); position += 1) {
        const prepared = await storage.prepare(imageBytes, 'png');
        await storage.promote(prepared);
        const image = await prisma.productImage.create({
          data: {
            productId: created.id,
            storageKey: prepared.storageKey,
            mediaType: 'PNG',
            byteSize: imageBytes.length,
            width: 3,
            height: 2,
            position,
          },
          select: { id: true },
        });
        imageIds.push(image.id);
      }
      if (options.status !== undefined && options.status !== 'DRAFT') {
        await prisma.product.update({
          where: { id: created.id },
          data: { status: options.status },
        });
      }
      return { id: created.id, imageIds, variantIds };
    }

    void before(async () => {
      assert.ok(testDatabaseUrl);
      storageRoot = await mkdtemp(join(tmpdir(), 'public-catalog-http-'));
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
      storage = moduleRef.get(ProductImageStorage);
      imageBytes = await sharp({
        create: { width: 3, height: 2, channels: 3, background: '#345678' },
      })
        .png()
        .toBuffer();
      await clearCatalog();
    });

    void beforeEach(clearCatalog);

    void after(async () => {
      await clearCatalog();
      await app.close();
      await rm(storageRoot, { recursive: true, force: true });
    });

    void test('returns an empty and then deterministic field-minimal public Category tree', async () => {
      await request(server(app)).get('/api/v1/catalog/categories').expect(200, []);
      const rootB = await category('B Root');
      const rootA = await category('A Root');
      const child = await category('Child', rootA);
      const response = await request(server(app)).get('/api/v1/catalog/categories').expect(200);
      assert.deepEqual(response.body, [
        { id: rootA, name: 'A Root', children: [{ id: child, name: 'Child', children: [] }] },
        { id: rootB, name: 'B Root', children: [] },
      ]);
      assert.equal(JSON.stringify(response.body).includes('parentId'), false);
      assert.equal(JSON.stringify(response.body).includes('createdAt'), false);
    });

    void test('lists only Active Products with exact filter, active prices, availability, and stable pages', async () => {
      const root = await category('Root');
      const child = await category('Child', root);
      const empty = await category('Empty');
      const tiedAt = new Date('2026-01-01T00:00:00.000Z');
      const first = await product({
        categoryId: root,
        status: 'ACTIVE',
        createdAt: tiedAt,
        name: 'Root Active',
        variants: [
          { active: true, price: 2000, quantity: 0, size: 'M' },
          { active: true, price: 4000, quantity: 2, size: 'L' },
          { active: false, price: 10, quantity: 99, size: 'XL' },
        ],
      });
      const second = await product({
        categoryId: child,
        status: 'ACTIVE',
        createdAt: tiedAt,
        name: 'Child Active',
      });
      await product({ categoryId: root, status: 'DRAFT', name: 'Hidden Draft' });
      await product({ categoryId: root, status: 'ARCHIVED', name: 'Hidden Archived' });

      const response = await request(server(app)).get('/api/v1/catalog/products').expect(200);
      const page = body<PublicListBody>(response);
      assert.equal(page.page, 1);
      assert.equal(page.pageSize, 24);
      assert.equal(page.totalItems, 2);
      assert.equal(page.totalPages, 1);
      assert.deepEqual(
        page.items.map(({ id }) => id),
        [first.id, second.id].sort().reverse(),
      );
      const rootSummary = page.items.find(({ id }) => id === first.id);
      assert.ok(rootSummary);
      assert.deepEqual(Object.keys(rootSummary).sort(), [
        'category',
        'id',
        'isAvailable',
        'mainImage',
        'maximumPriceRial',
        'minimumPriceRial',
        'name',
      ]);
      assert.equal(rootSummary.minimumPriceRial, 2000);
      assert.equal(rootSummary.maximumPriceRial, 4000);
      assert.equal(rootSummary.isAvailable, true);

      const firstPage = body<PublicListBody>(
        await request(server(app)).get('/api/v1/catalog/products?page=1&pageSize=1').expect(200),
      );
      const secondPage = body<PublicListBody>(
        await request(server(app)).get('/api/v1/catalog/products?page=2&pageSize=1').expect(200),
      );
      assert.equal(firstPage.totalPages, 2);
      assert.notEqual(firstPage.items[0]?.id, secondPage.items[0]?.id);

      const exactRoot = body<PublicListBody>(
        await request(server(app))
          .get(`/api/v1/catalog/products?categoryId=${root}&page=1&pageSize=1`)
          .expect(200),
      );
      assert.deepEqual(
        exactRoot.items.map(({ id }) => id),
        [first.id],
      );
      assert.equal(exactRoot.totalItems, 1);
      const emptyPage = body<PublicListBody>(
        await request(server(app)).get(`/api/v1/catalog/products?categoryId=${empty}`).expect(200),
      );
      assert.deepEqual(emptyPage.items, []);
      await request(server(app))
        .get(`/api/v1/catalog/products?categoryId=${randomUUID()}`)
        .expect(404)
        .expect((result: Response) =>
          assert.equal(body<ErrorBody>(result).code, 'CATEGORY_NOT_FOUND'),
        );
      await request(server(app)).get('/api/v1/catalog/products?pageSize=61').expect(400);
      await request(server(app)).get('/api/v1/catalog/products?status=ACTIVE').expect(400);
    });

    void test('returns field-minimal Active detail, ordered images, active Variants, and usable content URLs', async () => {
      const root = await category('Apparel');
      const child = await category('Shirts', root);
      const created = await product({
        categoryId: child,
        status: 'ACTIVE',
        imageCount: 2,
        variants: [
          { active: true, price: 3000, quantity: 0, size: 'M', color: 'Blue' },
          { active: true, price: 5000, quantity: 4, size: 'L', color: 'Blue' },
          { active: false, price: 1000, quantity: 8, size: 'XL', color: 'Red' },
        ],
      });
      const response = await request(server(app))
        .get(`/api/v1/catalog/products/${created.id}`)
        .expect(200);
      const detail = body<PublicDetailBody>(response);
      assert.deepEqual(Object.keys(detail).sort(), [
        'category',
        'categoryPath',
        'description',
        'id',
        'images',
        'isAvailable',
        'mainImage',
        'maximumPriceRial',
        'minimumPriceRial',
        'name',
        'variants',
      ]);
      assert.deepEqual(detail.categoryPath, [
        { id: root, name: 'Apparel' },
        { id: child, name: 'Shirts' },
      ]);
      assert.deepEqual(
        detail.images.map(({ id }) => id),
        created.imageIds,
      );
      assert.equal(detail.variants.length, 2);
      assert.ok(detail.variants.every(({ id }) => created.variantIds.includes(id)));
      assert.equal(detail.variants.find(({ size }) => size === 'M')?.isAvailable, false);
      assert.equal(detail.variants.find(({ size }) => size === 'L')?.isAvailable, true);
      assert.equal(JSON.stringify(detail).includes('sku'), false);
      assert.equal(JSON.stringify(detail).includes('onHandQuantity'), false);
      assert.equal(JSON.stringify(detail).includes('storageKey'), false);
      assert.equal(detail.mainImage.id, created.imageIds[0]);

      const content = await request(server(app))
        .get(detail.images[0]?.url ?? '')
        .expect(200);
      assert.deepEqual(content.body, imageBytes);
      await request(server(app)).get('/api/v1/catalog/settings/price-display-unit').expect(200);
    });

    void test('makes missing, Draft, and Archived detail indistinguishable and validates identifiers', async () => {
      const categoryId = await category('Lifecycle');
      const draft = await product({ categoryId, status: 'DRAFT' });
      const archived = await product({ categoryId, status: 'ARCHIVED' });
      const failures = await Promise.all(
        [randomUUID(), draft.id, archived.id].map((id) =>
          request(server(app)).get(`/api/v1/catalog/products/${id}`).expect(404),
        ),
      );
      const envelopes = failures.map((response) => body<ErrorBody>(response));
      assert.deepEqual(envelopes[0], envelopes[1]);
      assert.deepEqual(envelopes[1], envelopes[2]);
      assert.equal(envelopes[0]?.code, 'PRODUCT_NOT_FOUND');
      await request(server(app))
        .get('/api/v1/catalog/products/not-a-uuid')
        .expect(400)
        .expect((response: Response) =>
          assert.equal(body<ErrorBody>(response).code, 'VALIDATION_FAILED'),
        );
    });

    void test('publishes exact unauthenticated public OpenAPI contracts', async () => {
      const response = await request(server(app)).get('/api/docs-json').expect(200);
      const document = body<OpenApiDocument>(response);
      const categories = document.paths['/api/v1/catalog/categories']?.get;
      const products = document.paths['/api/v1/catalog/products']?.get;
      const detail = document.paths['/api/v1/catalog/products/{productId}']?.get;
      assert.ok(categories);
      assert.ok(products);
      assert.ok(detail);
      for (const operation of [categories, products, detail]) {
        assert.equal(operation.security, undefined);
        assert.equal(
          operation.parameters?.some(({ name }) => name === 'X-CSRF-Token') ?? false,
          false,
        );
      }
      assert.deepEqual(Object.keys(categories.responses ?? {}).sort(), ['200', '500']);
      assert.deepEqual(Object.keys(products.responses ?? {}).sort(), ['200', '400', '404', '500']);
      assert.deepEqual(Object.keys(detail.responses ?? {}).sort(), ['200', '400', '404', '500']);
      assert.deepEqual(products.parameters?.map(({ name }) => name).sort(), [
        'categoryId',
        'page',
        'pageSize',
      ]);
      assert.ok(
        detail.parameters?.some(
          ({ name, in: location }) => name === 'productId' && location === 'path',
        ),
      );
      const schemas = JSON.stringify(document.components.schemas);
      assert.match(schemas, /PublicProductDetailDto/u);
      assert.equal(schemas.includes('storageKey'), false);
    });
  },
);
