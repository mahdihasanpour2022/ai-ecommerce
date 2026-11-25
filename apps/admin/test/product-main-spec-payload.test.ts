import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildMainSpecificationsPayload } from '../features/products/utils/product-main-spec-payload';

void test('maps ordered main and secondary specifications to the create request objects', () => {
  const payload = buildMainSpecificationsPayload(
    [
      { key: 'جنس', value: 'نخ' },
      { key: 'مدل', value: '2' },
    ],
    [{ key: 'کشور سازنده', value: 'ایران' }],
  );

  assert.deepEqual(payload.specifications, [
    { title: 'جنس', description: 'نخ' },
    { title: 'مدل', description: '2' },
    { title: 'کشور سازنده', description: 'ایران' },
  ]);
  assert.deepEqual(payload.mainSpecs, [
    { title: 'جنس', description: 'نخ' },
    { title: 'مدل', description: '2' },
  ]);
});
