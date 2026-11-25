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

  assert.deepEqual(payload.specifications, { جنس: 'نخ', مدل: '2', 'کشور سازنده': 'ایران' });
  assert.deepEqual(payload.mainSpecs, { جنس: 'نخ', مدل: '2' });
  assert.deepEqual(Object.keys(payload.mainSpecs), ['جنس', 'مدل']);
});
