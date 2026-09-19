import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { CanActivate, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { CatalogAccessGuard } from '../src/catalog/catalog-access.guard.js';
import { ProductOptionController } from '../src/catalog/product-option.controller.js';
import {
  PRODUCT_COLOR_OPTIONS,
  PRODUCT_SIZE_OPTIONS,
  PRODUCT_STATUS_OPTIONS,
} from '../src/catalog/product-option.dto.js';
import { ProductOptionService } from '../src/catalog/product-option.service.js';

void test('returns the exact server-owned Product size, color, and status option contracts', () => {
  const service = new ProductOptionService();
  const controller = new ProductOptionController(service);

  assert.deepEqual(controller.sizes(), [
    'small',
    'medium',
    'large',
    'x-large',
    '2x-large',
    '3x-large',
  ]);
  assert.deepEqual(controller.colors(), [
    { 'color-name': 'blue', 'hex-code': '#2563EB' },
    { 'color-name': 'red', 'hex-code': '#DC2626' },
    { 'color-name': 'green', 'hex-code': '#16A34A' },
    { 'color-name': 'white', 'hex-code': '#FFFFFF' },
    { 'color-name': 'black', 'hex-code': '#111827' },
  ]);
  assert.deepEqual(controller.statuses(), [
    { status_persian_name: 'پیش‌نویس', status_english_name: 'DRAFT' },
    { status_persian_name: 'فعال', status_english_name: 'ACTIVE' },
    { status_persian_name: 'بایگانی‌شده', status_english_name: 'ARCHIVED' },
  ]);
  assert.equal(controller.sizes(), PRODUCT_SIZE_OPTIONS);
  assert.equal(controller.colors(), PRODUCT_COLOR_OPTIONS);
  assert.equal(controller.statuses(), PRODUCT_STATUS_OPTIONS);
});

void test('documents the Product status option endpoint and response fields in OpenAPI', async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [ProductOptionController],
    providers: [ProductOptionService],
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
