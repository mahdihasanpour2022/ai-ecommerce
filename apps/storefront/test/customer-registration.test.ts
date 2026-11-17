import assert from 'node:assert/strict';
import test from 'node:test';
import {
  customerRegistrationSchema,
  normalizeCustomerName,
  sanitizeCustomerNameInput,
} from '../features/customer-auth/customer-registration';

test('customer registration normalizes Persian-friendly names before submission', () => {
  assert.equal(normalizeCustomerName('  علی   رضا  '), 'علی رضا');
  assert.deepEqual(
    customerRegistrationSchema.parse({ firstName: 'علی   رضا ', lastName: 'نیک پی' }),
    { firstName: 'علی رضا', lastName: 'نیک پی' },
  );
  assert.equal(sanitizeCustomerNameInput(' 1مهدی<script>  احمدی'), 'مهدی احمدی');
});

test('customer registration returns field-specific errors for missing and invalid names', () => {
  const missing = customerRegistrationSchema.safeParse({ firstName: '', lastName: '   ' });
  assert.equal(missing.success, false);
  assert.deepEqual(
    missing.error?.issues.map(({ message, path }) => ({ message, path })),
    [
      { message: 'نام را وارد کنید.', path: ['firstName'] },
      { message: 'نام خانوادگی را وارد کنید.', path: ['lastName'] },
    ],
  );

  for (const value of ['ع', ' علی', 'علی2', 'Ali', 'نیک‌پی', 'علی<script>', 'الف'.repeat(51)]) {
    assert.equal(
      customerRegistrationSchema.safeParse({ firstName: value, lastName: 'احمدی' }).success,
      false,
    );
  }
});
