import assert from 'node:assert/strict';
import { test } from 'node:test';

import { bannerSchema } from '../features/banners/schemas/banner-schema';
import { installDomEnvironment } from './dom-environment';

const restoreDom = installDomEnvironment();
process.once('beforeExit', restoreDom);

void test('accepts optional trimmed alt text and an optional browser File', () => {
  const image = new File(['image'], 'banner.webp', { type: 'image/webp' });
  assert.deepEqual(bannerSchema.parse({ image, alt: '  فروش ویژه  ' }), {
    image,
    alt: 'فروش ویژه',
  });
  assert.equal(bannerSchema.safeParse({ alt: '' }).success, true);
  assert.equal(bannerSchema.safeParse({ image: 'banner.webp', alt: '' }).success, false);
  assert.equal(bannerSchema.safeParse({ alt: 'x'.repeat(161) }).success, false);
});
