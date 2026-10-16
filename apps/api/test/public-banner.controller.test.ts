import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { INestApplication } from '@nestjs/common';
import { HttpException } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { PublicBannerController } from '../src/catalog/banner.controller.js';
import { BannerService } from '../src/catalog/banner.service.js';

void describe('public Banner controller', () => {
  void test('returns the public Banner list without an authentication dependency', async () => {
    const expected = [
      {
        id: '10000000-0000-4000-8000-000000000001',
        src: '/api/v1/catalog/banners/10000000-0000-4000-8000-000000000001/content',
        alt: 'فروش ویژه',
        mediaType: 'WEBP' as const,
        byteSize: 100,
        width: 1200,
        height: 400,
        createdAt: '2026-10-14T00:00:00.000Z',
        updatedAt: '2026-10-14T00:00:00.000Z',
      },
    ];
    const banners = { list: () => Promise.resolve(expected) } as unknown as BannerService;

    assert.deepEqual(await new PublicBannerController(banners).list(), expected);
  });

  void test('sets safe public image headers', async () => {
    const bytes = Buffer.from('banner');
    const banners = {
      content: () =>
        Promise.resolve({
          banner: { mediaType: 'WEBP' as const, byteSize: bytes.length },
          bytes,
        }),
    } as unknown as BannerService;
    const headers = new Map<string, string | number>();
    const response = { setHeader: (name: string, value: string | number) => headers.set(name, value) };

    await new PublicBannerController(banners).content(
      '10000000-0000-4000-8000-000000000001',
      response,
    );

    assert.equal(headers.get('Content-Type'), 'image/webp');
    assert.equal(headers.get('Content-Length'), bytes.length);
    assert.equal(headers.get('Cache-Control'), 'public, max-age=300, no-transform');
    assert.equal(headers.get('X-Content-Type-Options'), 'nosniff');
  });

  void test('maps unexpected read failures to the safe internal envelope', async () => {
    const banners = {
      list: () => Promise.reject(new Error('database credentials and SQL')),
    } as unknown as BannerService;

    await assert.rejects(
      () => new PublicBannerController(banners).list(),
      (error: unknown) => {
        assert.ok(error instanceof HttpException);
        assert.equal(error.getStatus(), 500);
        assert.equal(JSON.stringify(error.getResponse()).includes('database credentials'), false);
        return true;
      },
    );
  });

  void test('publishes unauthenticated public OpenAPI read contracts', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PublicBannerController],
      providers: [{ provide: BannerService, useValue: { list: () => Promise.resolve([]) } }],
    }).compile();
    const app: INestApplication = moduleRef.createNestApplication({ logger: false });
    try {
      await app.init();
      await request(app.getHttpServer() as App).get('/catalog/banners').expect(200);
      const document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
      const list = document.paths['/catalog/banners']?.get;
      const content = document.paths['/catalog/banners/{bannerId}/content']?.get;

      assert.ok(list);
      assert.ok(content);
      assert.equal(list.security, undefined);
      assert.equal(content.security, undefined);
      assert.deepEqual(Object.keys(list.responses ?? {}).sort(), ['200', '500']);
      assert.deepEqual(Object.keys(content.responses ?? {}).sort(), ['200', '400', '404', '500']);
      const schemas = JSON.stringify(document.components?.schemas ?? {});
      assert.match(schemas, /BannerResponseDto/u);
      assert.match(schemas, /"src"/u);
      assert.match(schemas, /"alt"/u);
    } finally {
      await app.close();
    }
  });
});
