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

interface PublicListBody {
  readonly items: PublicSummaryBody[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
}

interface PublicDetailBody extends PublicSummaryBody {
  readonly categoryPath: Array<{ readonly id: string; readonly name: string }>;
  readonly images: PublicImageBody[];
  readonly variants: Array<{
    readonly id: string;
    readonly size: string | null;
    readonly color: string | null;
    readonly isAvailable: boolean;
  }>;
}

interface OpenApiOperation {
  readonly tags?: string[];
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
  const value = response.body as unknown;
  if (typeof value !== 'object' || value === null || !('hasError' in value)) return value as T;
  const envelope = value as {
    hasError: boolean;
    result: T | readonly unknown[] | null;
    singleResult: T | null;
    page?: number;
    pageSize?: number;
    totalItems?: number;
    totalPages?: number;
  };
  if (Array.isArray(envelope.result) && envelope.page !== undefined) {
    return {
      items: envelope.result,
      page: envelope.page,
      pageSize: envelope.pageSize,
      totalItems: envelope.totalItems,
      totalPages: envelope.totalPages,
    } as unknown as T;
  }
  return (envelope.hasError ? envelope : (envelope.singleResult ?? envelope.result)) as T;
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
      readonly tag?: string;
      readonly originalPriceRial?: number;
      readonly discountPercent?: number;
      readonly variants?: ReadonlyArray<{
        readonly active: boolean;
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
      const variants = options.variants ?? [{ active: true, quantity: 1, size: 'M' }];
      const created = await prisma.product.create({
        data: {
          name: options.name ?? `Product ${randomUUID()}`,
          description: 'Public plain-text description',
          tag: options.tag ?? null,
          originalPriceRial: options.originalPriceRial ?? 1000,
          discountPercent: options.discountPercent ?? 0,
          categoryId: options.categoryId,
          ...(options.createdAt === undefined ? {} : { createdAt: options.createdAt }),
          variants: {
            create: variants.map((variant) => ({
              sku: `PUBLIC-${randomUUID().toUpperCase()}`,
              size: variant.size ?? null,
              sizeKey: variant.size?.toLowerCase() ?? null,
              color: variant.color ?? null,
              colorKey: variant.color?.toLowerCase() ?? null,
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
      const emptyResponse = await request(server(app))
        .get('/api/v1/catalog/categories')
        .expect(200);
      assert.deepEqual(body<unknown[]>(emptyResponse), []);
      const rootB = await category('B Root');
      const rootA = await category('A Root');
      const child = await category('Child', rootA);
      const response = await request(server(app)).get('/api/v1/catalog/categories').expect(200);
      const tree = body<unknown[]>(response);
      assert.deepEqual(tree, [
        {
          id: rootA,
          name: 'A Root',
          src: null,
          children: [{ id: child, name: 'Child', src: null, children: [] }],
        },
        { id: rootB, name: 'B Root', src: null, children: [] },
      ]);
      assert.equal(JSON.stringify(tree).includes('parentId'), false);
      assert.equal(JSON.stringify(tree).includes('createdAt'), false);
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
        tag: 'featured_product',
        originalPriceRial: 4000,
        discountPercent: 25,
        variants: [
          { active: true, quantity: 0, size: 'M' },
          { active: true, quantity: 2, size: 'L' },
          { active: false, quantity: 99, size: 'XL' },
        ],
      });
      const second = await product({
        categoryId: child,
        status: 'ACTIVE',
        createdAt: tiedAt,
        name: 'Child Active',
        tag: 'sale',
      });
      await product({ categoryId: root, status: 'DRAFT', name: 'Hidden Draft' });
      await product({ categoryId: root, status: 'ARCHIVED', name: 'Hidden Archived' });

      const response = await request(server(app)).get('/api/v1/catalog/products').expect(200);
      const envelope = response.body as {
        readonly result: readonly PublicSummaryBody[];
        readonly singleResult: null;
        readonly page: number;
        readonly pageSize: number;
        readonly totalItems: number;
        readonly totalPages: number;
      };
      assert.ok(Array.isArray(envelope.result));
      assert.equal(envelope.singleResult, null);
      assert.equal(envelope.page, 1);
      assert.equal(envelope.pageSize, 24);
      assert.equal(envelope.totalItems, 2);
      assert.equal(envelope.totalPages, 1);
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
      assert.equal(rootSummary.original_price, 4000);
      assert.equal(rootSummary.final_price, 3000);
      assert.equal(rootSummary.discount, 25);
      assert.equal(rootSummary.currency, 'IRR');
      assert.equal(rootSummary.quantity, 2);
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
          .get(`/api/v1/catalog/products?categories=${root}&page=1&pageSize=1`)
          .expect(200),
      );
      assert.deepEqual(
        exactRoot.items.map(({ id }) => id),
        [first.id],
      );
      assert.equal(exactRoot.totalItems, 1);
      const emptyPage = body<PublicListBody>(
        await request(server(app)).get(`/api/v1/catalog/products?categories=${empty}`).expect(200),
      );
      assert.deepEqual(emptyPage.items, []);
      await request(server(app))
        .get(`/api/v1/catalog/products?categories=${randomUUID()}`)
        .expect(404)
        .expect((result: Response) =>
          assert.equal(body<ErrorBody>(result).code, 'CATEGORY_NOT_FOUND'),
        );
      const tagged = body<PublicListBody>(
        await request(server(app))
          .get(`/api/v1/catalog/products?categories=${root}&tags=featured_product`)
          .expect(200),
      );
      assert.deepEqual(
        tagged.items.map(({ id }) => id),
        [first.id],
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
        originalPriceRial: 5000,
        discountPercent: 20,
        variants: [
          { active: true, quantity: 0, size: 'M', color: 'Blue' },
          { active: true, quantity: 4, size: 'L', color: 'Blue' },
          { active: false, quantity: 8, size: 'XL', color: 'Red' },
        ],
      });
      const response = await request(server(app))
        .get(`/api/v1/catalog/products/${created.id}`)
        .expect(200);
      const detail = body<PublicDetailBody>(response);
      assert.deepEqual(Object.keys(detail).sort(), [
        'alt',
        'category',
        'categoryPath',
        'currency',
        'description',
        'discount',
        'final_price',
        'id',
        'image',
        'images',
        'isAvailable',
        'name',
        'original_price',
        'quantity',
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
      assert.equal(detail.image, detail.images[0]?.url);

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
      const categoryImage =
        document.paths['/api/v1/catalog/category-images/{imageId}/content']?.get;
      const products = document.paths['/api/v1/catalog/products']?.get;
      const detail = document.paths['/api/v1/catalog/products/{productId}']?.get;
      assert.ok(categories);
      assert.ok(categoryImage);
      assert.ok(products);
      assert.ok(detail);
      assert.deepEqual(categories.tags, ['site / categories']);
      assert.deepEqual(categoryImage.tags, ['site / category-images']);
      assert.deepEqual(products.tags, ['site / products']);
      assert.deepEqual(detail.tags, ['site / products']);
      for (const operation of [categories, categoryImage, products, detail]) {
        assert.equal(operation.security, undefined);
        assert.equal(
          operation.parameters?.some(({ name }) => name === 'X-CSRF-Token') ?? false,
          false,
        );
      }
      assert.deepEqual(Object.keys(categories.responses ?? {}).sort(), ['200', '500']);
      assert.deepEqual(Object.keys(categoryImage.responses ?? {}).sort(), [
        '200',
        '400',
        '404',
        '500',
      ]);
      assert.deepEqual(Object.keys(products.responses ?? {}).sort(), ['200', '400', '404', '500']);
      assert.deepEqual(Object.keys(detail.responses ?? {}).sort(), ['200', '400', '404', '500']);
      assert.deepEqual(products.parameters?.map(({ name }) => name).sort(), [
        'categories',
        'page',
        'pageSize',
        'tags',
      ]);
      assert.ok(
        detail.parameters?.some(
          ({ name, in: location }) => name === 'productId' && location === 'path',
        ),
      );
      const schemas = JSON.stringify(document.components.schemas);
      assert.match(schemas, /PublicCategoryDto/u);
      assert.match(schemas, /"src"/u);
      assert.match(schemas, /PublicProductDetailDto/u);
      assert.equal(schemas.includes('storageKey'), false);
    });
  },
);
