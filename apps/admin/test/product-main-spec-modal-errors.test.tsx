import { cleanup, render, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from 'antd';
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { ProductMainSpecModal } from '../features/products/components/product-main-spec-modal';
import { installDomEnvironment } from './dom-environment';

const restoreDom = installDomEnvironment();
after(() => {
  cleanup();
  restoreDom();
});

void test('keeps submit operable and focuses the first invalid main specification field', async () => {
  const screen = render(
    <App>
      <ProductMainSpecModal open existingKeys={[]} onCancel={() => undefined} onAdd={() => undefined} />
    </App>,
  );
  const dialog = await screen.findByRole('dialog', { name: 'افزودن ویژگی اصلی' });
  const user = userEvent.setup({ document: globalThis.document });
  const submit = within(dialog).getByRole('button', { name: 'افزودن ویژگی' });
  assert.equal((submit as HTMLButtonElement).disabled, false);
  await user.click(submit);

  const title = within(dialog).getByRole('textbox', { name: 'عنوان ویژگی' });
  assert.equal(globalThis.document.activeElement, title);
  assert.equal(title.getAttribute('aria-describedby'), 'main-spec-key-error');
  assert.equal(within(dialog).getAllByRole('alert').length, 2);
});
