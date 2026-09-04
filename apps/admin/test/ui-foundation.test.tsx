import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { Button } from 'antd';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { cleanup, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminUiProvider } from '../app/admin-ui-provider';
import { ControlledTextField } from '../app/forms/controlled-text-field';
import { installDomEnvironment } from './dom-environment';

const restoreDom = installDomEnvironment();
process.once('beforeExit', restoreDom);

after(() => {
  cleanup();
});

interface FoundationFormValues {
  readonly name: string;
}

function FoundationForm({ save }: Readonly<{ save(value: string): Promise<string> }>) {
  const [message, setMessage] = useState('');
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<FoundationFormValues>({ defaultValues: { name: '' }, shouldFocusError: true });

  return (
    <form
      noValidate
      onSubmit={(event) =>
        void handleSubmit(async ({ name }) => {
          const normalized = await save(name);
          reset({ name: normalized });
          setMessage('مقدار ذخیره شد.');
        })(event)
      }
    >
      <ControlledTextField
        control={control}
        name="name"
        label="نام آزمایشی"
        disabled={isSubmitting}
        rules={{
          required: 'نام الزامی است.',
          minLength: { value: 2, message: 'نام باید حداقل دو نویسه باشد.' },
        }}
      />
      <button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
        {isSubmitting ? 'در حال ذخیره…' : 'ذخیره'}
      </button>
      <p aria-live="polite">{message}</p>
    </form>
  );
}

void test('provides Persian RTL Ant Design components through the client provider', () => {
  const view = render(
    <AdminUiProvider>
      <Button>عملیات</Button>
    </AdminUiProvider>,
  );

  const button = view.getByRole('button', { name: 'عملیات' });
  assert.match(button.className, /ant-btn-rtl/u);
  cleanup();
});

void test('connects controlled fields, validation focus, pending state, and normalized reset', async () => {
  let resolveSave: ((value: string) => void) | undefined;
  const submitted: string[] = [];
  const save = (value: string) => {
    submitted.push(value);
    return new Promise<string>((resolve) => {
      resolveSave = resolve;
    });
  };
  const view = render(
    <AdminUiProvider>
      <FoundationForm save={save} />
    </AdminUiProvider>,
  );
  const user = userEvent.setup({ document: globalThis.document });
  const input = view.getByRole('textbox', { name: 'نام آزمایشی' });
  const submit = view.getByRole('button', { name: 'ذخیره' });

  await user.click(submit);
  assert.equal(view.getByRole('alert').textContent, 'نام الزامی است.');
  await waitFor(() => assert.equal(globalThis.document.activeElement, input));

  await user.type(input, '  نام  ');
  await user.click(submit);
  await waitFor(() => assert.equal(submitted.length, 1));
  assert.equal(submitted[0], '  نام  ');
  const pending = view.getByRole('button', { name: 'در حال ذخیره…' });
  assert.equal(pending.getAttribute('aria-busy'), 'true');
  assert.equal((pending as HTMLButtonElement).disabled, true);

  resolveSave?.('نام');
  await waitFor(() => assert.equal((input as HTMLInputElement).value, 'نام'));
  assert.equal(view.getByText('مقدار ذخیره شد.').getAttribute('aria-live'), 'polite');
  cleanup();
});
