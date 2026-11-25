import { cleanup, render, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from 'antd';
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { useFieldArray, useForm } from 'react-hook-form';
import { ProductSecondarySpecSection } from '../features/products/components/product-secondary-spec-section';
import type { CreateProductFormValues } from '../features/products/schemas/create-product-schema';
import { installDomEnvironment } from './dom-environment';

const restoreDom = installDomEnvironment();
after(() => {
  cleanup();
  restoreDom();
});

void test('adds, lists, and removes a secondary Product specification', async () => {
  function Harness() {
    const { control } = useForm<CreateProductFormValues>({
      defaultValues: { specifications: [] },
    });
    const { fields, append, remove } = useFieldArray({ control, name: 'specifications' });
    return (
      <ProductSecondarySpecSection
        fields={fields}
        mainSpecKeys={['جنس']}
        disabled={false}
        onAdd={append}
        onRemove={remove}
      />
    );
  }

  const screen = render(
    <App>
      <Harness />
    </App>,
  );
  const user = userEvent.setup({ document: globalThis.document });
  await user.click(screen.getByRole('button', { name: 'افزودن ویژگی' }));
  const dialog = await screen.findByRole('dialog', { name: 'افزودن ویژگی فرعی' });
  await user.type(within(dialog).getByRole('textbox', { name: 'عنوان ویژگی' }), 'کشور سازنده');
  await user.type(within(dialog).getByRole('textbox', { name: 'مقدار ویژگی' }), 'ایران');
  await user.click(within(dialog).getByRole('button', { name: 'افزودن ویژگی' }));

  assert.ok(screen.getByText('کشور سازنده'));
  assert.ok(screen.getByText('ایران'));
  await user.click(screen.getByRole('button', { name: 'حذف ویژگی فرعی 1' }));
  assert.equal(screen.queryByText('کشور سازنده'), null);
});
