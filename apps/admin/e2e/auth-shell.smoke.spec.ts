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

test('renders Admin routes inside the shared authenticated shell', async ({ page }) => {
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
  await expect(page.getByRole('complementary', { name: 'نوار کناری پنل مدیریت' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'صفحه اصلی' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.locator('a[href^="/catalog"]')).toHaveCount(0);

  const shellStyles = await page.getByTestId('admin-shell').evaluate((element) => {
    const styles = getComputedStyle(element);
    return { gap: styles.gap, padding: styles.padding };
  });
  expect(shellStyles).toEqual({ gap: '20px', padding: '20px' });

  for (const landmark of [
    page.getByRole('banner'),
    page.getByRole('complementary', { name: 'نوار کناری پنل مدیریت' }),
    page.getByRole('main'),
  ]) {
    const styles = await landmark.evaluate((element) => {
      const computed = getComputedStyle(element);
      return {
        backgroundColor: computed.backgroundColor,
        borderRadius: computed.borderRadius,
        borderWidth: computed.borderTopWidth,
        boxShadow: computed.boxShadow,
        padding: computed.padding,
      };
    });
    expect(styles.backgroundColor).toBe('rgb(255, 255, 255)');
    expect(styles.borderRadius).toBe('16px');
    expect(styles.borderWidth).toBe('0px');
    expect(styles.boxShadow).not.toBe('none');
    expect(styles.padding).toBe('20px');
  }

  const homeLink = page.getByRole('link', { name: 'صفحه اصلی' });
  await expect(homeLink).toHaveCSS('background-color', 'rgb(242, 178, 73)');
  await expect(homeLink).toHaveCSS('color', 'rgb(45, 33, 18)');

  const darkThemeToggle = page.getByRole('button', { name: 'فعال‌کردن حالت تاریک' });
  await expect(darkThemeToggle).toHaveAttribute('aria-pressed', 'false');
  await darkThemeToggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByTestId('admin-shell')).toHaveCSS('background-color', 'rgb(43, 47, 56)');
  for (const landmark of [
    page.getByRole('banner'),
    page.getByRole('complementary', { name: 'نوار کناری پنل مدیریت' }),
    page.getByRole('main'),
  ]) {
    await expect(landmark).toHaveCSS('background-color', 'rgb(27, 30, 36)');
  }
  const lightThemeToggle = page.getByRole('button', { name: 'فعال‌کردن حالت روشن' });
  await expect(lightThemeToggle).toHaveAttribute('aria-pressed', 'true');
  await lightThemeToggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  await page.getByRole('link', { name: 'مدیریت دسته‌بندی‌ها' }).click();
  await expect(page).toHaveURL('/categories');
  await expect(page.getByRole('heading', { level: 2, name: 'مدیریت دسته‌بندی‌ها' })).toBeVisible();
  await expect(page.getByText('پوشاک')).toBeVisible();
  await expect(page.getByRole('region', { name: 'جدول دسته‌بندی‌ها' })).toBeVisible();
  for (const heading of ['زیر‌دسته‌ها', 'شناسه', 'نام', 'زمان ایجاد', 'عملیات']) {
    await expect(page.getByRole('columnheader', { name: heading })).toBeVisible();
  }
  await page.getByRole('button', { name: 'نمایش زیر‌دسته‌های پوشاک' }).click();
  await expect(page.getByText('مانتو')).toBeVisible();
  await page.getByRole('button', { name: 'عملیات دسته‌بندی پوشاک' }).click();
  const categoryActions = page.getByRole('dialog', { name: 'عملیات پوشاک' });
  await expect(categoryActions).toBeVisible();
  await categoryActions.getByRole('button', { name: 'ویرایش' }).click();
  const editDialog = page.getByRole('dialog', { name: 'ویرایش دسته‌بندی' });
  await expect(editDialog).toBeVisible();
  await expect(editDialog.getByRole('textbox', { name: 'نام دسته‌بندی' })).toHaveValue('پوشاک');
  await editDialog.getByRole('button', { name: 'انصراف' }).click();
  await expect(editDialog).toBeHidden();
  for (const width of [375, 768, 1280, 1536]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole('region', { name: 'جدول دسته‌بندی‌ها' })).toBeVisible();
    const pageHasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(pageHasHorizontalOverflow).toBe(false);
  }
  await expect(page.getByRole('link', { name: 'مدیریت دسته‌بندی‌ها' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(homeLink).not.toHaveAttribute('aria-current', 'page');

  const accessibility = await new AxeBuilder({ page }).analyze();
  const seriousViolations = accessibility.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );
  expect(seriousViolations).toEqual([]);
});
