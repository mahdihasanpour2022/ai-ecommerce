import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('renders the production authentication shell in accessible Persian RTL', async ({ page }) => {
  await page.context().addCookies([
    { name: 'admin_refresh_token', value: 'synthetic-refresh', domain: '127.0.0.1', path: '/' },
    { name: 'e2e_auth', value: 'unauthenticated', domain: '127.0.0.1', path: '/' },
  ]);

  await page.goto('/');

  await expect(page).toHaveURL('/login');
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

test('renders the authenticated Admin home without feature routes', async ({ page }) => {
  await page.context().addCookies([
    { name: 'admin_refresh_token', value: 'synthetic-refresh', domain: '127.0.0.1', path: '/' },
    { name: 'admin_access_token', value: 'synthetic-access', domain: '127.0.0.1', path: '/' },
    { name: 'e2e_auth', value: 'authenticated', domain: '127.0.0.1', path: '/' },
  ]);

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('button')).toBeVisible();
  await expect(page.locator('a[href^="/catalog"]')).toHaveCount(0);

  const accessibility = await new AxeBuilder({ page }).analyze();
  const seriousViolations = accessibility.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );
  expect(seriousViolations).toEqual([]);
});
