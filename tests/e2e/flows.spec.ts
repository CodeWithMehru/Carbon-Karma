import { test, expect } from '@playwright/test';

/**
 * Public, hermetic end-to-end flows.
 *
 * These run without any backend credentials: the proxy and landing page treat
 * an unreachable Supabase as "logged out", so unauthenticated journeys (landing,
 * auth pages, route protection) render deterministically in any environment.
 */
test.describe('Public flows', () => {
  // ── Landing ───────────────────────────────────────────────────────────────
  test('renders the landing page with hero and CTA', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Impact');
    await expect(page.locator('a:has-text("Get Started")').first()).toBeVisible();
  });

  test('Get Started navigates to signup', async ({ page }) => {
    await page.goto('/');
    await page.locator('a:has-text("Get Started")').first().click();
    await expect(page).toHaveURL(/\/signup/);
    await expect(page.locator('h1')).toContainText('Create your account');
  });

  // ── Auth pages ────────────────────────────────────────────────────────────
  test('login page shows the email/password form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('Welcome back');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('invalid sign-in keeps the user on the login page', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'not-an-email');
    await page.fill('input[type="password"]', 'short');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/login/);
  });

  test('invalid sign-up keeps the user on the signup page', async ({ page }) => {
    await page.goto('/signup');
    await page.fill('input[name="fullName"]', 'M');
    await page.fill('input[type="email"]', 'bad-email');
    await page.fill('input[type="password"]', '123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/signup/);
  });

  // ── Route protection ──────────────────────────────────────────────────────
  for (const route of ['/dashboard', '/upload', '/actions', '/onboarding', '/feed', '/map']) {
    test(`redirects unauthenticated users from ${route} to /login`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/);
    });
  }

  // ── Security headers ──────────────────────────────────────────────────────
  test('serves hardening security headers', async ({ page }) => {
    const response = await page.goto('/');
    const headers = response?.headers() ?? {};
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['content-security-policy']).toContain("default-src 'self'");
  });

  // ── 404 ───────────────────────────────────────────────────────────────────
  test('returns 404 for unknown routes', async ({ page }) => {
    const response = await page.goto('/this-route-does-not-exist');
    expect(response?.status()).toBe(404);
  });
});
