import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { LoginForm } from '../app/components/login-form';

void test('renders accessible email-or-username and six-digit password semantics', () => {
  const html = renderToStaticMarkup(
    <LoginForm
      submitting={false}
      error="اطلاعات ورود نادرست است."
      onSubmit={async () => undefined}
    />,
  );

  assert.match(html, /<label for="identifier">ایمیل یا نام کاربری<\/label>/);
  assert.match(html, /id="identifier"/);
  assert.match(html, /dir="ltr"/);
  assert.match(html, /autoComplete="username"/);
  assert.match(html, /type="password"/);
  assert.match(html, /inputMode="numeric"/);
  assert.match(html, /pattern="\[0-9\]\{6\}"/);
  assert.match(html, /maxLength="6"/);
  assert.match(html, /autoComplete="current-password"/);
  assert.match(html, /role="alert"/);
  assert.match(html, /اطلاعات ورود نادرست است/);
});

void test('renders a disabled busy submit state that prevents repeat interaction', () => {
  const html = renderToStaticMarkup(
    <LoginForm submitting error={null} onSubmit={async () => undefined} />,
  );

  assert.match(html, /<button[^>]*disabled=""[^>]*aria-busy="true"/);
  assert.match(html, /در حال ورود…/);
});
