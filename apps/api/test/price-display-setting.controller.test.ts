import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { HttpException } from '@nestjs/common';

import {
  AdminPriceDisplaySettingController,
  PublicPriceDisplaySettingController,
} from '../src/catalog/price-display-setting.controller.js';
import { PriceDisplaySettingService } from '../src/catalog/price-display-setting.service.js';

function failingService(): PriceDisplaySettingService {
  return {
    read: () => Promise.reject(new Error('database detail must remain private')),
    update: () => Promise.reject(new Error('database detail must remain private')),
  } as unknown as PriceDisplaySettingService;
}

async function expectSafeInternal(work: Promise<unknown>): Promise<void> {
  await assert.rejects(work, (error: unknown) => {
    if (!(error instanceof HttpException)) return false;
    assert.equal(error.getStatus(), 500);
    assert.deepEqual(error.getResponse(), {
      statusCode: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'خطای داخلی سرور رخ داد.',
      details: [],
    });
    return true;
  });
}

void describe('Price display-setting safe controller failures', () => {
  void test('does not expose singleton read or update failures', async () => {
    const service = failingService();
    await expectSafeInternal(new PublicPriceDisplaySettingController(service).read());
    const admin = new AdminPriceDisplaySettingController(service);
    await expectSafeInternal(admin.read());
    await expectSafeInternal(admin.update({ unit: 'RIAL' }));
  });
});
