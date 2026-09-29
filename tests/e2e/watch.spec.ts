// tests/e2e/watch.spec.ts
import { expect, test } from '@playwright/test';

async function openFirstPlaylist(page: import('@playwright/test').Page) {
  await page.goto('/?type=playlist');
  await expect(page.getByRole('button', { name: 'Playlists' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('course-badge').first()).toHaveText(/^▶ \d+$/);
  await page.getByTestId('course-card').first().click();
  await expect(page).toHaveURL(/\/watch\//);
}

test('playlist watch page: player, list, switching videos, back button', async ({ page }) => {
  await openFirstPlaylist(page);
  await expect(page.locator('iframe[src*="youtube"]')).toBeVisible({ timeout: 20_000 });

  const current = page.locator('[data-testid="playlist"] button[aria-current="true"]');
  await expect(current).toHaveCount(1);

  const other = page.locator('[data-testid="playlist"] button:not([aria-current="true"]):not([disabled])').first();
  await other.click();
  await expect(page).toHaveURL(/\?v=[A-Za-z0-9_-]{11}/);
  const firstV = new URL(page.url()).searchParams.get('v');

  const another = page.locator('[data-testid="playlist"] button:not([aria-current="true"]):not([disabled])').first();
  await another.click();
  await expect(page).not.toHaveURL(new RegExp(`v=${firstV}`));
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`v=${firstV}`));
  await expect(page.locator('[data-testid="playlist"] button[aria-current="true"]')).toHaveCount(1);
});

test('unknown ?v= falls back to a real video', async ({ page }) => {
  await openFirstPlaylist(page);
  const url = new URL(page.url());
  url.searchParams.set('v', 'zzzzzzzzzzz');
  await page.goto(url.toString());
  await expect(page.locator('[data-testid="playlist"] button[aria-current="true"]')).toHaveCount(1);
});

test('mark watched shows a tick and the course appears in Continue watching', async ({ page }) => {
  await openFirstPlaylist(page);
  await page.getByRole('button', { name: 'Mark watched' }).click();
  await expect(page.getByRole('button', { name: '✓ Watched' })).toBeVisible();
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Continue watching' })).toBeVisible();
  await expect(page.getByTestId('continue-card').first()).toBeVisible();
});

test('unknown course id shows the 404 page', async ({ page }) => {
  const res = await page.goto('/watch/definitely-not-a-course-000000');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Course not found' })).toBeVisible();
});
