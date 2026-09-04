import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { HttpException } from '@nestjs/common';

import { PublicCatalogController } from '../src/catalog/public-catalog.controller.js';
import type { PublicCatalogService } from '../src/catalog/public-catalog.service.js';

void describe('public catalog safe controller failures', () => {
  void test('maps unexpected read failures to the safe internal envelope', async () => {
    const catalog = {
      categories: () => Promise.reject(new Error('database credentials and SQL')),
    } as unknown as PublicCatalogService;
    const controller = new PublicCatalogController(catalog);

    await assert.rejects(
      () => controller.categories(),
      (error: unknown) => {
        assert.ok(error instanceof HttpException);
        assert.equal(error.getStatus(), 500);
        const body = error.getResponse() as Record<string, unknown>;
        assert.equal(body.code, 'INTERNAL_SERVER_ERROR');
        assert.equal(JSON.stringify(body).includes('database credentials'), false);
        return true;
      },
    );
  });
});
