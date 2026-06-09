import { test, expect } from '@playwright/test';

// Public-route smoke coverage. These require a running dev server with valid
// Supabase env (`npm run dev`) — Playwright is intentionally NOT part of the
// CI gate (CI runs Vitest); run locally with `npx playwright test`.
//
// Coverage is deliberately weighted toward the navigation shell and routing,
// since SiteNavbar + route transitions are decomposed in Phase 5 of the
// professional-refactor plan and this is their regression net.

test.describe('Critical flows', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=sLearningKaka').first()).toBeVisible();
  });

  test('courses page loads', async ({ page }) => {
    await page.goto('/courses');
    await expect(page.locator('text=Khoá học').first()).toBeVisible();
  });

  test('login page accessible', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('signup page accessible', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('unauthenticated redirect from dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL('**/login**');
  });

  test('unauthenticated redirect from teacher area', async ({ page }) => {
    await page.goto('/teacher');
    await page.waitForURL('**/login**');
  });

  test.describe('navigation shell (SiteNavbar)', () => {
    test('navbar brand links back to home from a deep route', async ({ page }) => {
      await page.goto('/courses');
      const brand = page.getByRole('link', { name: /sLearningKaka/i }).first();
      await expect(brand).toBeVisible();
      await brand.click();
      await page.waitForURL((url) => url.pathname === '/');
    });

    test('client-side navigation from home to courses works', async ({ page }) => {
      await page.goto('/');
      await page
        .getByRole('link', { name: /Khoá học/i })
        .first()
        .click();
      await page.waitForURL('**/courses');
      await expect(page).toHaveURL(/\/courses/);
    });

    test('login page exposes a route back to signup', async ({ page }) => {
      await page.goto('/login');
      await expect(page.getByRole('link', { name: /Đăng ký|signup/i }).first()).toBeVisible();
    });
  });
});
