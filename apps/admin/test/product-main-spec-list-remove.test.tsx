import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from 'antd';
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { useFieldArray, useForm } from 'react-hook-form';
import { ProductMainSpecSection } from '../features/products/components/product-main-spec-section';
import type { CreateProductFormValues } from '../features/products/schemas/create-product-schema';
import { installDomEnvironment } from './dom-environment';

const restoreDom = installDomEnvironment();
after(() => {
  cleanup();
  restoreDom();
});

void test('removes a main specification and renumbers the remaining rows', async () => {
  function Harness() {
    const { control } = useForm<CreateProductFormValues>({
      defaultValues: { mainSpecs: [{ key: 'جنس', value: 'نخ' }, { key: 'مدل', value: '2' }] },
    });
    const { fields, append, remove } = useFieldArray({ control, name: 'mainSpecs' });
    return (
      <ProductMainSpecSection
        fields={fields}
        disabled={false}
        onAdd={append}
        onRemove={remove}
      />
    );
  }

  const screen = render(<App><Harness /></App>);
  const user = userEvent.setup({ document: globalThis.document });
  await user.click(screen.getByRole('button', { name: 'حذف ویژگی اصلی 1' }));

  assert.equal(screen.queryByText('جنس'), null);
  assert.ok(screen.getByText('مدل'));
  assert.ok(screen.getByText('1.'));
});
