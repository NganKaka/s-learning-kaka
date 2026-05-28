import { test, expect } from '@playwright/test';

test.describe('Critical flows', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=sLearningKaka')).toBeVisible();
  });

  test('courses page loads', async ({ page }) => {
    await page.goto('/courses');
    await expect(page.locator('text=Khoá học')).toBeVisible();
  });

  test('login page accessible', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('unauthenticated redirect from dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL('**/login**');
  });
});
