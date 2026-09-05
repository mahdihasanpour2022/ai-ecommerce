import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppLoading } from '../app/components/app-loading';
import { StatusPanel } from '../app/components/status-panel';

void test('shows a custom visible message in the shared accessible loader', () => {
  const html = renderToStaticMarkup(<AppLoading message="در حال بارگذاری محصولات..." />);

  assert.match(html, /role="status"/u);
  assert.match(html, /aria-busy="true"/u);
  assert.match(html, /admin-loader\.svg/u);
  assert.match(html, /app-loading-message/u);
  assert.match(html, /در حال بارگذاری محصولات\.\.\./u);
});

void test('uses the requested default message when none is provided', () => {
  const html = renderToStaticMarkup(<AppLoading />);

  assert.match(html, /لطفا منتظر بمانید\.\.\./u);
});

void test('replaces visible bootstrap copy with the shared fullscreen loader', () => {
  const html = renderToStaticMarkup(
    <StatusPanel busy title="در حال بررسی نشست" message="لطفاً منتظر بمانید." />,
  );

  assert.match(html, /app-loading-fullscreen/u);
  assert.doesNotMatch(html, /<h1>/u);
  assert.doesNotMatch(html, /لطفاً منتظر بمانید/u);
  assert.match(html, /در حال بررسی نشست/u);
});
