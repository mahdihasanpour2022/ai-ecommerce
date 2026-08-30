import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { DocumentShell } from '../app/document-shell';

void test('renders the Admin document in Persian RTL', () => {
  const html = renderToStaticMarkup(
    <DocumentShell>
      <main>پنل مدیریت</main>
    </DocumentShell>,
  );

  assert.match(html, /^<html lang="fa-IR" dir="rtl">/);
  assert.match(html, /<main>پنل مدیریت<\/main>/);
});
