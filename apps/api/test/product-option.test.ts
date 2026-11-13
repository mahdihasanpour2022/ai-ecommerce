import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { CanActivate, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { CatalogAccessGuard } from '../src/catalog/catalog-access.guard.js';
import { ProductOptionController } from '../src/catalog/product-option.controller.js';
import { PRODUCT_STATUS_OPTIONS } from '../src/catalog/product-option.dto.js';
import { ProductOptionRepository } from '../src/catalog/product-option.repository.js';
import { ProductOptionService } from '../src/catalog/product-option.service.js';

void test('returns repository-backed Product size and color options plus server-owned statuses', async () => {
  const sizes = [
    { 'persian-size-name': 'بزرگ', 'english-size-name': 'large' },
  ] as const;
  const colors = [
    { 'persian-color-name': 'آبی', 'english-color-name': 'blue', 'hex-code': '#2563EB' },
  ] as const;
  const repository = {
    sizes: () => Promise.resolve(sizes),
    colors: () => Promise.resolve(colors),
  } as unknown as ProductOptionRepository;
  const service = new ProductOptionService(repository);
  const controller = new ProductOptionController(service);

  assert.equal(await controller.sizes(), sizes);
  assert.equal(await controller.colors(), colors);
  assert.deepEqual(controller.statuses(), [
    { status_persian_name: 'پیش‌نویس', status_english_name: 'DRAFT' },
    { status_persian_name: 'فعال', status_english_name: 'ACTIVE' },
    { status_persian_name: 'بایگانی‌شده', status_english_name: 'ARCHIVED' },
  ]);
  assert.equal(controller.statuses(), PRODUCT_STATUS_OPTIONS);
});

void test('documents the Product status option endpoint and response fields in OpenAPI', async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [ProductOptionController],
    providers: [
      ProductOptionService,
      { provide: ProductOptionRepository, useValue: {} },
    ],
  })
    .overrideGuard(CatalogAccessGuard)
    .useValue({ canActivate: () => true } satisfies CanActivate)
    .compile();
  const app: INestApplication = moduleRef.createNestApplication({ logger: false });

  try {
    await app.init();
    const document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
    const operation = document.paths['/admin/catalog/product-options/statuses']?.get;
    const schema = document.components?.schemas?.ProductStatusOptionDto as
      { properties?: Record<string, unknown> } | undefined;

    assert.ok(operation);
    assert.deepEqual(Object.keys(operation.responses).sort(), ['200', '401', '403']);
    assert.ok(schema?.properties?.status_persian_name);
    assert.ok(schema?.properties?.status_english_name);
  } finally {
    await app.close();
  }
});
