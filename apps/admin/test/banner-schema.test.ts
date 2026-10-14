import assert from 'node:assert/strict';
import { test } from 'node:test';

import { bannerSchema } from '../features/banners/schemas/banner-schema';
import { installDomEnvironment } from './dom-environment';

const restoreDom = installDomEnvironment();
process.once('beforeExit', restoreDom);

void test('requires a browser File for Banner forms', () => {
  const image = new File(['image'], 'banner.webp', { type: 'image/webp' });
  assert.equal(bannerSchema.safeParse({ image }).success, true);
  assert.equal(bannerSchema.safeParse({}).success, false);
  assert.equal(bannerSchema.safeParse({ image: 'banner.webp' }).success, false);
});
