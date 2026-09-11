import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { Button } from 'antd';
import { cleanup, render } from '@testing-library/react';
import { AdminUiProvider } from '../app/admin-ui-provider';
import { UiButton } from '../app/components/shared/ui-button';
import { installDomEnvironment } from './dom-environment';

const restoreDom = installDomEnvironment();
process.once('beforeExit', restoreDom);

after(() => {
  cleanup();
});

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

void test('shared buttons forward native attributes and compose caller classes', () => {
  const view = render(
    <UiButton variant="secondary" className="feature-action" name="archive" disabled>
      بایگانی
    </UiButton>,
  );
  const button = view.getByRole('button', { name: 'بایگانی' });
  assert.equal(button.getAttribute('name'), 'archive');
  assert.equal((button as HTMLButtonElement).disabled, true);
  assert.match(button.className, /feature-action/u);
  assert.match(button.className, /border-border/u);
  cleanup();
});
