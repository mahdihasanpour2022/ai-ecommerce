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

void test('shows a normalized case-insensitive duplicate error on the title field', async () => {
  const screen = render(
    <App>
      <ProductMainSpecModal
        open
        existingKeys={['Material']}
        onCancel={() => undefined}
        onAdd={() => undefined}
      />
    </App>,
  );
  const dialog = await screen.findByRole('dialog', { name: 'افزودن ویژگی اصلی' });
  const user = userEvent.setup({ document: globalThis.document });
  await user.type(within(dialog).getByRole('textbox', { name: 'عنوان ویژگی' }), ' material ');
  await user.type(within(dialog).getByRole('textbox', { name: 'مقدار ویژگی' }), 'Cotton');
  await user.click(within(dialog).getByRole('button', { name: 'افزودن ویژگی' }));

  const title = within(dialog).getByRole('textbox', { name: 'عنوان ویژگی' });
  assert.equal(title.getAttribute('aria-describedby'), 'main-spec-key-error');
  assert.ok(within(dialog).getByText('این عنوان ویژگی قبلاً اضافه شده است.'));
});
