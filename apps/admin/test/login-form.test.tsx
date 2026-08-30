import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { LoginForm } from '../app/components/login-form';

void test('renders Persian accessible login semantics and mixed-direction email input', () => {
  const html = renderToStaticMarkup(
    <LoginForm
      email="admin@example.com"
      password=""
      submitting={false}
      error="اطلاعات ورود نادرست است."
      onEmailChange={() => undefined}
      onPasswordChange={() => undefined}
      onSubmit={() => undefined}
    />,
  );

  assert.match(html, /<label for="email">ایمیل<\/label>/);
  assert.match(html, /type="email"/);
  assert.match(html, /dir="ltr"/);
  assert.match(html, /autoComplete="username"/);
  assert.match(html, /type="password"/);
  assert.match(html, /autoComplete="current-password"/);
  assert.match(html, /role="alert"/);
  assert.match(html, /اطلاعات ورود نادرست است/);
});

void test('renders a disabled busy submit state that prevents repeat interaction', () => {
  const html = renderToStaticMarkup(
    <LoginForm
      email="admin@example.com"
      password="transient"
      submitting
      error={null}
      onEmailChange={() => undefined}
      onPasswordChange={() => undefined}
      onSubmit={() => undefined}
    />,
  );

  assert.match(html, /<button[^>]*disabled=""[^>]*aria-busy="true"/);
  assert.match(html, /در حال ورود…/);
});
