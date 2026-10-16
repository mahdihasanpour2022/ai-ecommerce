import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { App } from 'antd';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { BannerFormModal } from '../features/banners/components/banner-form-modal';
import type { Banner } from '../features/banners/interfaces/banner-contract';
import type { BannerFormValues } from '../features/banners/schemas/banner-schema';
import { installDomEnvironment } from './dom-environment';

const restoreDom = installDomEnvironment();
process.once('beforeExit', restoreDom);
afterEach(() => cleanup());

const banner: Banner = {
  id: '10000000-0000-4000-8000-000000000001',
  src: '/api/v1/catalog/banners/10000000-0000-4000-8000-000000000001/content',
  alt: 'عنوان فعلی',
  mediaType: 'WEBP',
  byteSize: 1024,
  width: 1440,
  height: 480,
  createdAt: '2026-10-15T08:00:00.000Z',
  updatedAt: '2026-10-15T08:00:00.000Z',
};

void test('requires an image when creating a Banner', async () => {
  const user = userEvent.setup();
  let submitted = false;
  render(
    <App>
      <BannerFormModal
        open
        mode="create"
        pending={false}
        onCancel={() => undefined}
        onSubmit={() => {
          submitted = true;
          return Promise.resolve();
        }}
      />
    </App>,
  );

  const dialog = await screen.findByRole('dialog', { name: 'ایجاد بنر' });
  await user.click(within(dialog).getByRole('button', { name: 'ایجاد بنر' }));

  assert.equal(submitted, false);
  assert.ok(await within(dialog).findByText('تصویر بنر را انتخاب کنید.'));
});

void test('prefills and updates alt without requiring a replacement image', async () => {
  const user = userEvent.setup();
  let submitted: BannerFormValues | undefined;
  render(
    <App>
      <BannerFormModal
        open
        mode="edit"
        banner={banner}
        pending={false}
        onCancel={() => undefined}
        onSubmit={(values) => {
          submitted = values;
          return Promise.resolve();
        }}
      />
    </App>,
  );

  const dialog = await screen.findByRole('dialog', { name: 'ویرایش بنر' });
  const alt = within(dialog).getByRole('textbox', { name: 'متن جایگزین تصویر (اختیاری)' });
  await waitFor(() => assert.equal((alt as HTMLInputElement).value, banner.alt));
  await user.clear(alt);
  await user.type(alt, '  عنوان جدید  ');
  await user.click(within(dialog).getByRole('button', { name: 'ذخیره تغییرات' }));

  await waitFor(() => assert.deepEqual(submitted, { alt: 'عنوان جدید' }));
});
