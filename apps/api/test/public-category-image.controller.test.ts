import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';

import { PublicCategoryImageController } from '../src/catalog/category-image.controller.js';
import { CategoryService } from '../src/catalog/category.service.js';

void describe('public Category Image controller', () => {
  void test('sets immutable public image headers', async () => {
    const bytes = Buffer.from('category-image');
    const categories = {
      content: () =>
        Promise.resolve({
          image: { mediaType: 'WEBP' as const, byteSize: bytes.length },
          bytes,
        }),
    } as unknown as CategoryService;
    const headers = new Map<string, string | number>();
    const response = {
      setHeader: (name: string, value: string | number) => headers.set(name, value),
    };

    await new PublicCategoryImageController(categories).content(
      '10000000-0000-4000-8000-000000000001',
      response,
    );

    assert.equal(headers.get('Content-Type'), 'image/webp');
    assert.equal(headers.get('Content-Length'), bytes.length);
    assert.equal(headers.get('Cache-Control'), 'public, max-age=31536000, immutable');
    assert.equal(headers.get('X-Content-Type-Options'), 'nosniff');
  });

  void test('publishes an unauthenticated public OpenAPI content contract', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PublicCategoryImageController],
      providers: [{ provide: CategoryService, useValue: { content: () => Promise.resolve(null) } }],
    }).compile();
    const app: INestApplication = moduleRef.createNestApplication({ logger: false });
    try {
      await app.init();
      const document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
      const content = document.paths['/catalog/category-images/{imageId}/content']?.get;

      assert.ok(content);
      assert.equal(content.security, undefined);
      assert.deepEqual(Object.keys(content.responses ?? {}).sort(), ['200', '400', '404', '500']);
    } finally {
      await app.close();
    }
  });
});
