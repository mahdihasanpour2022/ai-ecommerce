import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('renders the production authentication shell in accessible Persian RTL', async ({ page }) => {
  await page.route('**/api/v1/auth/csrf', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ csrfToken: 'synthetic-browser-csrf' }),
    });
  });
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        statusCode: 401,
        code: 'AUTHENTICATION_REQUIRED',
        message: 'نشست معتبر نیست.',
        details: [],
      }),
    });
  });

  await page.goto('/catalog/products');

  await expect(page).toHaveURL('/login?returnTo=%2Fcatalog%2Fproducts');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fa-IR');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { level: 1, name: 'ورود مدیر' })).toBeVisible();
  const email = page.getByRole('textbox', { name: 'ایمیل' });
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press('Tab');
  await expect(email).toBeFocused();

  const accessibility = await new AxeBuilder({ page }).analyze();
  const seriousViolations = accessibility.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );
  expect(seriousViolations).toEqual([]);
});

test('protects the responsive catalog shell with independent permission presentation', async ({
  page,
}) => {
  let permissions = ['admin.access', 'catalog.read', 'inventory.update'];
  await page.route('**/api/v1/auth/csrf', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ csrfToken: 'synthetic-catalog-csrf' }),
    });
  });
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        admin: {
          id: '55555555-5555-4555-8555-555555555555',
          email: 'catalog@example.com',
          displayName: 'مدیر کاتالوگ',
        },
        authorization: {
          roles: ['CATALOG_READER'],
          permissions,
        },
      }),
    });
  });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/catalog/products');

  await expect(page.getByRole('heading', { level: 1, name: 'محصولات' })).toBeVisible();
  const toggle = page.getByRole('button', { name: 'فهرست بخش‌ها' });
  await expect(toggle).toBeVisible();
  await toggle.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('link', { name: 'محصولات' })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByText('موجودی برای حساب شما فقط خواندنی خواهد بود.')).toHaveCount(0);
  await expect(page.getByText('حساب شما مجوز به‌روزرسانی موجودی را دارد.')).toBeVisible();

  await page.goto('/catalog/products/new');
  await expect(
    page.getByRole('heading', { level: 1, name: 'ایجاد محصول مجاز نیست' }),
  ).toBeFocused();
  await expect(page.getByRole('link', { name: 'بازگشت به محصولات' })).toBeVisible();

  permissions = ['admin.access'];
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
