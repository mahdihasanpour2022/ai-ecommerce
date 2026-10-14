import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { App } from 'antd';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { BannerTable } from '../features/banners/components/banner-table';
import type { Banner } from '../features/banners/interfaces/banner-contract';
import { installDomEnvironment } from './dom-environment';

const restoreDom = installDomEnvironment();
process.once('beforeExit', restoreDom);
afterEach(() => cleanup());

const banner: Banner = {
  id: '10000000-0000-4000-8000-000000000001',
  mediaType: 'WEBP',
  byteSize: 1024,
  width: 1440,
  height: 480,
  createdAt: '2026-10-14T08:30:00.000Z',
  updatedAt: '2026-10-14T08:30:00.000Z',
};

void test('shows Banner metadata and exposes edit and delete actions', async () => {
  const user = userEvent.setup();
  let edited: Banner | null = null;
  let deleted: Banner | null = null;
  const view = render(
    <App>
      <BannerTable
        banners={[banner]}
        pending={false}
        onEdit={(value) => {
          edited = value;
        }}
        onDelete={(value) => {
          deleted = value;
        }}
      />
    </App>,
  );

  assert.match(view.getByText(/۱۴۴۰/u).textContent ?? '', /۴۸۰/u);
  await user.click(view.getByRole('button', { name: 'ویرایش' }));
  await user.click(view.getByRole('button', { name: 'حذف' }));
  assert.equal(edited, banner);
  assert.equal(deleted, banner);
});
