import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { CustomerAuthenticationError } from '../src/customer-authentication/customer-authentication.errors';
import { parseCustomerRegistration } from '../src/customer-authentication/customer-registration.dto';

void describe('Customer registration input policy', () => {
  void test('normalizes surrounding and repeated whitespace while preserving valid name characters', () => {
    assert.deepEqual(
      parseCustomerRegistration({ firstName: '  علی   رضا  ', lastName: 'نیک‌پی' }),
      { firstName: 'علی رضا', lastName: 'نیک‌پی' },
    );
    assert.deepEqual(
      parseCustomerRegistration({ firstName: "Jean-Pierre", lastName: "O'Connor" }),
      { firstName: 'Jean-Pierre', lastName: "O'Connor" },
    );
  });

  void test('rejects malformed objects, invalid content and out-of-range names', () => {
    const invalidBodies: unknown[] = [
      null,
      { firstName: 'علی' },
      { firstName: 'علی', lastName: 'احمدی', extra: true },
      { firstName: 'ع', lastName: 'احمدی' },
      { firstName: 'علی<script>', lastName: 'احمدی' },
      { firstName: 'علی2', lastName: 'احمدی' },
      { firstName: 'علی', lastName: 'الف'.repeat(51) },
    ];
    for (const body of invalidBodies) {
      assert.throws(
        () => parseCustomerRegistration(body),
        (error: unknown) =>
          error instanceof CustomerAuthenticationError &&
          error.code === 'CUSTOMER_NAME_INVALID' &&
          error.statusCode === 422,
      );
    }
  });
});
