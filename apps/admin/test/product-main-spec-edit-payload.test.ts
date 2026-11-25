import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildChangedMainSpecificationsPayload } from '../features/products/utils/product-main-spec-payload';

void test('builds an edit replacement only when ordered main specifications change', () => {
  assert.equal(
    buildChangedMainSpecificationsPayload(
      [
        { title: 'جنس', description: 'نخ' },
        { title: 'مدل', description: '2' },
      ],
      [
        { key: 'جنس', value: 'نخ' },
        { key: 'مدل', value: '2' },
      ],
    ),
    undefined,
  );

  assert.deepEqual(
    buildChangedMainSpecificationsPayload(
      [{ title: 'جنس', description: 'نخ' }],
      [{ key: 'مدل', value: '2' }],
      [
        { title: 'جنس', description: 'نخ' },
        { title: 'کشور سازنده', description: 'ایران' },
      ],
    ),
    {
      specifications: [
        { title: 'مدل', description: '2' },
        { title: 'کشور سازنده', description: 'ایران' },
      ],
      mainSpecs: [{ title: 'مدل', description: '2' }],
    },
  );

  assert.deepEqual(
    buildChangedMainSpecificationsPayload([{ title: 'جنس', description: 'نخ' }], []),
    {
      specifications: [],
      mainSpecs: [],
    },
  );

  assert.deepEqual(
    buildChangedMainSpecificationsPayload(
      [{ title: 'جنس', description: 'نخ' }],
      [{ key: 'جنس', value: 'نخ' }],
      [
        { title: 'جنس', description: 'نخ' },
        { title: 'کشور سازنده', description: 'ایران' },
      ],
      [{ key: 'کشور سازنده', value: 'ترکیه' }],
    ),
    {
      specifications: [
        { title: 'جنس', description: 'نخ' },
        { title: 'کشور سازنده', description: 'ترکیه' },
      ],
      mainSpecs: [{ title: 'جنس', description: 'نخ' }],
    },
  );
});
