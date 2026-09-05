import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('renders the production authentication shell in accessible Persian RTL', async ({ page }) => {
  await page.context().addCookies([
    { name: 'admin_refresh_token', value: 'synthetic-refresh', domain: '127.0.0.1', path: '/' },
    { name: 'e2e_auth', value: 'unauthenticated', domain: '127.0.0.1', path: '/' },
  ]);

  await page.goto('/catalog/products');

  await expect(page).toHaveURL('/login?returnTo=%2Fcatalog%2Fproducts');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fa-IR');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { level: 1, name: 'ورود به پنل مدیریت' })).toBeVisible();
  const identifier = page.getByRole('textbox', { name: 'ایمیل یا نام کاربری' });
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press('Tab');
  await expect(identifier).toBeFocused();

  const accessibility = await new AxeBuilder({ page }).analyze();
  const seriousViolations = accessibility.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );
  expect(seriousViolations).toEqual([]);
});

test('protects the responsive Product routes with exact permission presentation', async ({
  page,
}) => {
  let permissions = ['admin.access', 'catalog.read', 'inventory.update'];
  const categoryId = '11111111-1111-4111-8111-111111111111';
  const productId = '22222222-2222-4222-8222-222222222222';
  await page.context().addCookies([
    { name: 'admin_refresh_token', value: 'synthetic-refresh', domain: '127.0.0.1', path: '/' },
    { name: 'admin_access_token', value: 'synthetic-access', domain: '127.0.0.1', path: '/' },
    { name: 'e2e_auth', value: 'catalog', domain: '127.0.0.1', path: '/' },
    {
      name: 'e2e_permissions',
      value: permissions.join('|'),
      domain: '127.0.0.1',
      path: '/',
    },
  ]);
  await page.route('**/api/v1/admin/catalog/categories', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: categoryId,
          name: 'پیراهن',
          parentId: null,
          level: 1,
          children: [],
          createdAt: '2026-09-04T08:00:00.000Z',
          updatedAt: '2026-09-04T08:00:00.000Z',
        },
      ]),
    });
  });
  await page.route('**/api/v1/admin/catalog/settings/price-display-unit', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ unit: 'TOMAN' }),
    });
  });
  await page.route('**/api/v1/admin/catalog/products**', async (route) => {
    if (new URL(route.request().url()).pathname.endsWith(`/products/${productId}`)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: productId,
          name: 'پیراهن نخی',
          description: null,
          category: { id: categoryId, name: 'پیراهن' },
          status: 'DRAFT',
          imageVersion: 1,
          variants: [
            {
              id: '33333333-3333-4333-8333-333333333333',
              productId,
              sku: 'SHIRT-M',
              size: 'M',
              color: null,
              priceRial: 12_300,
              isActive: true,
              inventory: { onHandQuantity: 5, version: 1 },
              createdAt: '2026-09-04T08:00:00.000Z',
              updatedAt: '2026-09-04T08:00:00.000Z',
            },
          ],
          images: [],
          createdAt: '2026-09-04T08:00:00.000Z',
          updatedAt: '2026-09-04T08:00:00.000Z',
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [], page: 1, pageSize: 25, totalItems: 0, totalPages: 0 }),
    });
  });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/catalog/products');

  await expect(page.getByRole('heading', { level: 1, name: 'محصولات' })).toBeVisible();
  await expect(page.getByText('محصولات برای حساب شما فقط خواندنی هستند.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'ایجاد محصول پیش‌نویس' })).toHaveCount(0);
  const toggle = page.getByRole('button', { name: 'فهرست بخش‌ها' });
  await expect(toggle).toBeVisible();
  await toggle.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('link', { name: 'محصولات' })).toHaveAttribute('aria-current', 'page');

  await page.goto('/catalog/products/new');
  await expect(
    page.getByRole('heading', { level: 1, name: 'ایجاد محصول مجاز نیست' }),
  ).toBeFocused();
  await expect(page.getByRole('link', { name: 'بازگشت به محصولات' })).toBeVisible();

  await page.goto(`/catalog/products/${productId}?section=variants`);
  await expect(page.getByRole('heading', { level: 1, name: 'پیراهن نخی' })).toBeVisible();
  await expect(page.getByText('موجودی دقیق: ۵')).toBeVisible();
  await expect(page.getByRole('button', { name: 'ذخیره تنوع' })).toHaveCount(0);

  permissions = ['admin.access'];
  await page.context().addCookies([
    {
      name: 'e2e_permissions',
      value: permissions.join('|'),
      domain: '127.0.0.1',
      path: '/',
    },
  ]);
  await page.reload();
  await expect(
    page.getByRole('heading', { level: 1, name: 'دسترسی به کاتالوگ مجاز نیست' }),
  ).toBeFocused();
  await expect(page.getByRole('link', { name: 'بازگشت به خانه مدیریت' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'بخش‌های مدیریت' })).toHaveCount(0);

  const accessibility = await new AxeBuilder({ page }).analyze();
  const seriousViolations = accessibility.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );
  expect(seriousViolations).toEqual([]);
});
