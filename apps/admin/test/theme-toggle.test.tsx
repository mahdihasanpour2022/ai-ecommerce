import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { cleanup, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminUiProvider } from '../app/admin-ui-provider';
import { ThemeToggle } from '../app/components/theme-toggle';
import { installDomEnvironment } from './dom-environment';

const restoreDom = installDomEnvironment();
process.once('beforeExit', restoreDom);
afterEach(() => {
  cleanup();
  document.cookie = 'admin_theme=; Path=/; Max-Age=0; SameSite=Lax';
});

void test('toggles and persists the accessible Admin color theme', async () => {
  const screen = render(
    <AdminUiProvider initialTheme="light">
      <ThemeToggle />
    </AdminUiProvider>,
  );
  const user = userEvent.setup({ document: globalThis.document });

  const darkButton = screen.getByRole('button', { name: 'فعال‌کردن حالت تاریک' });
  assert.equal(darkButton.getAttribute('aria-pressed'), 'false');
  assert.ok(darkButton.querySelector('[data-icon="moon"]'));

  await user.click(darkButton);

  const lightButton = screen.getByRole('button', { name: 'فعال‌کردن حالت روشن' });
  assert.equal(lightButton.getAttribute('aria-pressed'), 'true');
  assert.ok(lightButton.querySelector('[data-icon="sun"]'));
  await waitFor(() => assert.equal(document.documentElement.dataset.theme, 'dark'));
  assert.equal(document.documentElement.style.colorScheme, 'dark');
  assert.match(document.cookie, /(?:^|;\s*)admin_theme=dark(?:;|$)/u);
});
