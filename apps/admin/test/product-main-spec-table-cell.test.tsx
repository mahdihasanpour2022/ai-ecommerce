import { cleanup, render, within } from '@testing-library/react';
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { ProductMainSpecsCell } from '../features/products/components/product-main-specs-cell';
import { installDomEnvironment } from './dom-environment';

const restoreDom = installDomEnvironment();
after(() => {
  cleanup();
  restoreDom();
});

void test('renders Product main specifications in insertion order and handles an empty value', () => {
  const screen = render(
    <div>
      <section aria-label="ویژگی‌های محصول">
        <ProductMainSpecsCell
          mainSpecs={{ 'جنس پارچه': 'نخ پنبه', مدل: '2', سایز: '42' }}
        />
      </section>
      <section aria-label="محصول بدون ویژگی">
        <ProductMainSpecsCell mainSpecs={{}} />
      </section>
    </div>,
  );

  const table = within(screen.getByRole('region', { name: 'ویژگی‌های محصول' })).getByRole('table', {
    name: 'ویژگی‌های اصلی محصول',
  });
  assert.deepEqual(
    within(table)
      .getAllByRole('columnheader')
      .map((header) => header.textContent),
    ['عنوان', 'توضیحات'],
  );
  const rows = within(table).getAllByRole('row').slice(1);
  assert.deepEqual(
    rows.map((row) => ({
      title: within(row).getByRole('rowheader').textContent,
      value: within(row).getByRole('cell').textContent,
    })),
    [
      { title: 'جنس پارچه', value: 'نخ پنبه' },
      { title: 'مدل', value: '2' },
      { title: 'سایز', value: '42' },
    ],
  );
  assert.ok(
    within(screen.getByRole('region', { name: 'محصول بدون ویژگی' })).getByText(
      'بدون ویژگی اصلی',
    ),
  );
});
