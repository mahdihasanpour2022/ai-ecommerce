import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { cleanup, render, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToStaticMarkup } from 'react-dom/server';
import { LogoutButton } from '../app/components/logout-button';
import { installDomEnvironment } from './dom-environment';

const restoreDom = installDomEnvironment();
process.once('beforeExit', restoreDom);
afterEach(() => cleanup());

void test('renders an accessible Persian logout control', () => {
  const html = renderToStaticMarkup(
    <LogoutButton submitting={false} message={null} onLogout={() => undefined} />,
  );

  assert.match(html, /<button[^>]*type="button"/);
  assert.match(html, /aria-busy="false"/);
  assert.match(html, /خروج از حساب/);
  assert.doesNotMatch(html, /role="alert"/);
});

void test('requires confirmation and cancels without logging out', async () => {
  let logoutCount = 0;
  const screen = render(
    <LogoutButton
      submitting={false}
      message={null}
      onLogout={() => {
        logoutCount += 1;
      }}
    />,
  );
  const user = userEvent.setup({ document: globalThis.document });

  await user.click(screen.getByRole('button', { name: 'خروج از حساب' }));
  const dialog = await screen.findByRole('dialog', { name: 'خروج از حساب کاربری' });
  assert.equal(logoutCount, 0);
  assert.match(dialog.textContent ?? '', /آیا مطمئن هستید/);

  await user.click(within(dialog).getByRole('button', { name: 'انصراف' }));
  await waitFor(() => assert.equal(screen.queryByRole('dialog'), null));
  assert.equal(logoutCount, 0);
});

void test('logs out exactly once after explicit confirmation', async () => {
  let logoutCount = 0;
  const screen = render(
    <LogoutButton
      submitting={false}
      message={null}
      onLogout={() => {
        logoutCount += 1;
      }}
    />,
  );
  const user = userEvent.setup({ document: globalThis.document });

  await user.click(screen.getByRole('button', { name: 'خروج از حساب' }));
  const dialog = await screen.findByRole('dialog', { name: 'خروج از حساب کاربری' });
  await user.click(within(dialog).getByRole('button', { name: 'بله، خارج شوم' }));

  await waitFor(() => assert.equal(screen.queryByRole('dialog'), null));
  assert.equal(logoutCount, 1);
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
