import { expect, test } from '@playwright/test';

test('a donor can sign in and complete onboarding', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') runtimeErrors.push(message.text()); });
  await page.goto('/');
  await page.getByRole('button', { name: /Get started/i }).click();
  await expect(page.getByRole('heading', { name: /Complete your FoodShare profile/i })).toBeVisible();
  await page.getByLabel(/Organization name/).fill('Harbour Test Kitchen');
  await page.getByLabel(/Contact person/).fill('Sam Perera');
  await page.getByLabel(/Phone number/).fill('0112345678');
  await page.getByLabel(/Tax or registration ID/).fill('REG-100');
  await page.getByLabel(/Organization address/).fill('10 Market Street, Colombo');
  await page.getByLabel(/Operating hours/).fill('Monday–Friday, 08:00–17:00');
  await page.getByRole('button', { name: /Complete profile/i }).click();
  await expect(page.getByRole('heading', { name: /Share food while it is still useful/i })).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});
