import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { cleanup, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CatalogShellView } from '../app/catalog/catalog-shell';
import { CatalogState } from '../app/catalog/catalog-state';
import { installDomEnvironment } from './dom-environment';

const restoreDom = installDomEnvironment();
process.once('beforeExit', restoreDom);

after(() => {
  cleanup();
});

const ALL_CAPABILITIES = {
  read: true,
  manage: true,
  inventory: true,
  media: true,
  priceSetting: true,
} as const;

void test('renders named active navigation and a keyboard-operable narrow-screen disclosure', async () => {
  const view = render(
    <CatalogShellView
      pathname="/catalog/products/22222222-2222-4222-8222-222222222222"
      displayName="مدیر آزمون"
      email="admin@example.com"
      capabilities={ALL_CAPABILITIES}
      logoutSubmitting={false}
      logoutMessage={null}
      onLogout={() => undefined}
    >
      <h1>فضای محصول</h1>
    </CatalogShellView>,
  );
  const navigation = view.getByRole('navigation', { name: 'بخش‌های مدیریت' });
  assert.equal(view.getByRole('link', { name: 'محصولات' }).getAttribute('aria-current'), 'page');
  assert.equal(
    view.getByRole('link', { name: 'دسته‌بندی‌ها' }).hasAttribute('aria-current'),
    false,
  );
  assert.equal(
    view.getByText('admin@example.com').closest('bdi')?.getAttribute('class'),
    'ltr-value',
  );

  const toggle = view.getByRole('button', { name: 'فهرست بخش‌ها' });
  assert.equal(toggle.getAttribute('aria-controls'), navigation.id);
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  const user = userEvent.setup({ document: globalThis.document });
  toggle.focus();
  await user.keyboard('{Enter}');
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  assert.equal(navigation.getAttribute('data-open'), 'true');
  cleanup();
});

void test('does not expose catalog destinations when catalog read is absent', () => {
  const view = render(
    <CatalogShellView
      pathname="/"
      displayName="مدیر محدود"
      email="limited@example.com"
      capabilities={{
        read: false,
        manage: false,
        inventory: false,
        media: false,
        priceSetting: false,
      }}
      logoutSubmitting={false}
      logoutMessage={null}
      onLogout={() => undefined}
    >
      <h1>خانه</h1>
    </CatalogShellView>,
  );
  assert.equal(view.queryByRole('link', { name: 'محصولات' }), null);
  assert.ok(view.getByRole('link', { name: 'خانه' }));
  cleanup();
});

void test('focuses blocking states and exposes an explicit retry without repeating automatically', async () => {
  let retries = 0;
  const view = render(
    <CatalogState
      kind="error"
      title="نمایش ممکن نشد"
      message="ارتباط با سرور برقرار نشد."
      onRetry={() => {
        retries += 1;
      }}
    />,
  );
  const heading = view.getByRole('heading', { level: 1, name: 'نمایش ممکن نشد' });
  await waitFor(() => assert.equal(globalThis.document.activeElement, heading));
  assert.ok(view.getByRole('alert'));
  assert.equal(retries, 0);
  const user = userEvent.setup({ document: globalThis.document });
  await user.click(view.getByRole('button', { name: 'تلاش دوباره' }));
  assert.equal(retries, 1);
  cleanup();
});
