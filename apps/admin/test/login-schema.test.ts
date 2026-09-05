import assert from 'node:assert/strict';
import test from 'node:test';
import { loginSchema } from '../app/login/login-schema';

void test('normalizes and accepts an email or canonical username with six ASCII digits', () => {
  assert.deepEqual(loginSchema.parse({ identifier: '  Admin@Example.COM  ', password: '654321' }), {
    identifier: 'admin@example.com',
    password: '654321',
  });
  assert.deepEqual(loginSchema.parse({ identifier: '  Admin_User  ', password: '654321' }), {
    identifier: 'admin_user',
    password: '654321',
  });
});

for (const identifier of ['ab', 'a'.repeat(21), 'admin-user', 'مدیر', 'not-an-email']) {
  void test(`rejects an invalid login identifier: ${identifier}`, () => {
    assert.equal(loginSchema.safeParse({ identifier, password: '654321' }).success, false);
  });
}

for (const password of ['12345', '1234567', '12a456', '۱۲۳۴۵۶', ' 12345']) {
  void test(`rejects an invalid login password: ${password}`, () => {
    assert.equal(
      loginSchema.safeParse({ identifier: 'admin@example.com', password }).success,
      false,
    );
  });
}
