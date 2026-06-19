import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility end-to-end checks.
 *
 * Combines structural assertions (landmarks, skip link, the reachable
 * accessibility menu) with automated axe-core scans. The axe scans gate on
 * `critical` violations so the suite stays deterministic across environments.
 */
test.describe('Accessibility', () => {
  test('landing page exposes a main landmark and skip link', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('main')).toBeAttached();
    await expect(page.locator('.skip-link')).toBeAttached();
  });

  test('auth pages render a form landmark', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('form')).toBeAttached();
    await page.goto('/signup');
    await expect(page.locator('form')).toBeAttached();
  });

  test('accessibility menu toggles the high-contrast theme', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Accessibility options' }).click();
    const toggle = page.getByRole('switch', { name: /high contrast/i });
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.locator('html')).toHaveClass(/high-contrast/);
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  test('landing page has no critical accessibility violations', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter((v) => v.impact === 'critical');
    expect(critical).toEqual([]);
  });

  test('login page has no critical accessibility violations', async ({ page }) => {
    await page.goto('/login');
    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter((v) => v.impact === 'critical');
    expect(critical).toEqual([]);
  });
});
