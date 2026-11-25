import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildChangedMainSpecificationsPayload } from '../features/products/utils/product-main-spec-payload';

void test('builds an edit replacement only when ordered main specifications change', () => {
  assert.equal(
    buildChangedMainSpecificationsPayload({ جنس: 'نخ', مدل: '2' }, [
      { key: 'جنس', value: 'نخ' },
      { key: 'مدل', value: '2' },
    ]),
    undefined,
  );

  assert.deepEqual(
    buildChangedMainSpecificationsPayload({ جنس: 'نخ' }, [{ key: 'مدل', value: '2' }], {
      جنس: 'نخ',
      'کشور سازنده': 'ایران',
    }),
    {
      specifications: { مدل: '2', 'کشور سازنده': 'ایران' },
      mainSpecs: { مدل: '2' },
    },
  );

  assert.deepEqual(buildChangedMainSpecificationsPayload({ جنس: 'نخ' }, []), {
    specifications: {},
    mainSpecs: {},
  });

  assert.deepEqual(
    buildChangedMainSpecificationsPayload(
      { جنس: 'نخ' },
      [{ key: 'جنس', value: 'نخ' }],
      { جنس: 'نخ', 'کشور سازنده': 'ایران' },
      [{ key: 'کشور سازنده', value: 'ترکیه' }],
    ),
    {
      specifications: { جنس: 'نخ', 'کشور سازنده': 'ترکیه' },
      mainSpecs: { جنس: 'نخ' },
    },
  );
});
