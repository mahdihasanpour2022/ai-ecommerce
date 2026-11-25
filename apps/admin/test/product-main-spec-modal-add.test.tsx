import { cleanup, render, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from 'antd';
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { useState } from 'react';
import { ProductMainSpecModal } from '../features/products/components/product-main-spec-modal';
import type { ProductMainSpec } from '../features/products/schemas/product-main-spec-schema';
import { installDomEnvironment } from './dom-environment';

const restoreDom = installDomEnvironment();
after(() => {
  cleanup();
  restoreDom();
});

void test('adds one normalized main specification and closes its modal', async () => {
  let added: ProductMainSpec | undefined;
  let parentSubmissions = 0;
  function Harness() {
    const [open, setOpen] = useState(true);
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          parentSubmissions += 1;
        }}
      >
        <ProductMainSpecModal
          open={open}
          existingKeys={[]}
          onCancel={() => setOpen(false)}
          onAdd={(item) => {
            added = item;
            setOpen(false);
          }}
        />
      </form>
    );
  }

  const screen = render(<App><Harness /></App>);
  const dialog = await screen.findByRole('dialog', { name: 'افزودن ویژگی اصلی' });
  const user = userEvent.setup({ document: globalThis.document });
  await user.type(within(dialog).getByRole('textbox', { name: 'عنوان ویژگی' }), '  جنس   پارچه ');
  await user.type(within(dialog).getByRole('textbox', { name: 'مقدار ویژگی' }), ' نخ_100 ');
  await user.click(within(dialog).getByRole('button', { name: 'افزودن ویژگی' }));

  assert.deepEqual(added, { key: 'جنس پارچه', value: 'نخ_100' });
  assert.equal(parentSubmissions, 0);
  assert.equal(screen.queryByRole('dialog'), null);
});
