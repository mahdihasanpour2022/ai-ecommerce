import assert from 'node:assert/strict';
import test from 'node:test';
import { catalogCapabilities } from '../app/catalog/catalog-permissions';

void test('requires catalog read before exposing every independent catalog capability', () => {
  assert.deepEqual(
    catalogCapabilities([
      'catalog.manage',
      'inventory.update',
      'product.media.manage',
      'settings.price.display.unit.update',
    ]),
    { read: false, manage: false, inventory: false, media: false, priceSetting: false },
  );
});

void test('calculates each mutation capability independently from the current snapshot', () => {
  assert.deepEqual(catalogCapabilities(['catalog.read', 'inventory.update']), {
    read: true,
    manage: false,
    inventory: true,
    media: false,
    priceSetting: false,
  });
  assert.deepEqual(
    catalogCapabilities([
      'catalog.read',
      'catalog.manage',
      'product.media.manage',
      'settings.price.display.unit.update',
    ]),
    { read: true, manage: true, inventory: false, media: true, priceSetting: true },
  );
});
