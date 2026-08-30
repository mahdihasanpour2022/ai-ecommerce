import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { LogoutButton } from '../app/components/logout-button';

void test('renders an accessible Persian logout control', () => {
  const html = renderToStaticMarkup(
    <LogoutButton submitting={false} message={null} onLogout={() => undefined} />,
  );

  assert.match(html, /<button[^>]*type="button"/);
  assert.match(html, /aria-busy="false"/);
  assert.match(html, /خروج از حساب/);
  assert.doesNotMatch(html, /role="alert"/);
});

void test('renders a disabled pending state and an associated retryable failure', () => {
  const pending = renderToStaticMarkup(
    <LogoutButton submitting message={null} onLogout={() => undefined} />,
  );
  assert.match(pending, /<button[^>]*disabled=""[^>]*aria-busy="true"/);
  assert.match(pending, /در حال خروج…/);

  const failed = renderToStaticMarkup(
    <LogoutButton
      submitting={false}
      message="ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید."
      onLogout={() => undefined}
    />,
  );
  assert.match(failed, /aria-describedby="logout-error"/);
  assert.match(failed, /id="logout-error" role="alert"/);
  assert.match(failed, /ارتباط با سرور برقرار نشد/);
});
