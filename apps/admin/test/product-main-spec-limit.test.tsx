import { cleanup, render } from '@testing-library/react';
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

void test('disables adding another main specification when three fixtures exist', () => {
  function Harness() {
    const { control } = useForm<CreateProductFormValues>({
      defaultValues: {
        mainSpecs: [
          { key: 'جنس', value: 'نخ' },
          { key: 'مدل', value: '2' },
          { key: 'سایز', value: '42' },
        ],
      },
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
  const add = screen.getByRole('button', { name: 'سقف ۳ ویژگی تکمیل شد' });
  assert.equal((add as HTMLButtonElement).disabled, true);
});
