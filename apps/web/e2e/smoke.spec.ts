import { test, expect } from '@playwright/test';

test('homepage loads', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Redefining The Flow of Fine Dining.' })
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Reserve' })).toBeVisible();
});

test('login page loads', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});

test('register page loads', async ({ page }) => {
  await page.goto('/register');
  await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible();
});
