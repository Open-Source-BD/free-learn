// tests/e2e/watch.spec.ts
import { expect, test } from '@playwright/test';

async function openFirstPlaylist(page: import('@playwright/test').Page) {
  await page.goto('/?type=playlist');
  await expect(page.getByRole('button', { name: 'Playlists' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('course-badge').first()).toHaveText(/^▶ \d+$/);
  await page.getByTestId('course-card').first().click();
  await expect(page).toHaveURL(/\/watch\//);
}

test('opening a playlist course puts ?v= in the URL', async ({ page }) => {
  await openFirstPlaylist(page);
  await expect(page).toHaveURL(/\?v=[A-Za-z0-9_-]{11}/);
});

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
  await expect(page).not.toHaveURL(/zzzzzzzzzzz/);
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

test('control bar: next and previous move through the playlist', async ({ page }) => {
  await openFirstPlaylist(page);
  await expect(page).toHaveURL(/\?v=[A-Za-z0-9_-]{11}/);
  const bar = page.getByTestId('control-bar');
  const first = new URL(page.url()).searchParams.get('v')!;
  await expect(bar.getByRole('button', { name: 'Next' })).toBeEnabled();
  await bar.getByRole('button', { name: 'Next' }).click();
  await expect(page).not.toHaveURL(new RegExp(`v=${first}`));
  await bar.getByRole('button', { name: 'Previous' }).click();
  await expect(page).toHaveURL(new RegExp(`v=${first}`));
});

test('control bar: play/pause label follows the player', async ({ page }) => {
  await openFirstPlaylist(page);
  await expect(page.locator('iframe[src*="youtube"]')).toBeVisible({ timeout: 20_000 });
  const bar = page.getByTestId('control-bar');
  await expect(async () => {
    await bar.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(bar.getByRole('button', { name: 'Pause', exact: true })).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 30_000 });
  await bar.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(bar.getByRole('button', { name: 'Play', exact: true })).toBeVisible({ timeout: 10_000 });
});

test('control bar: playlist toggle hides and shows the list', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openFirstPlaylist(page);
  const bar = page.getByTestId('control-bar');
  await expect(page.getByTestId('playlist')).toBeVisible();
  await bar.getByRole('button', { name: 'Playlist' }).click();
  await expect(page.getByTestId('playlist')).toHaveCount(0);
  await expect(bar.getByRole('button', { name: 'Playlist' })).toHaveAttribute('aria-pressed', 'false');
  await bar.getByRole('button', { name: 'Playlist' }).click();
  await expect(page.getByTestId('playlist')).toBeVisible();
});

test('the last "More" card ends above the control bar', async ({ page }) => {
  await openFirstPlaylist(page);
  const bar = page.getByTestId('control-bar');
  await expect(bar).toBeVisible();
  const cards = page.getByTestId('course-card');
  test.skip((await cards.count()) === 0, 'no related courses on this page');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(300);
  const card = await cards.last().boundingBox();
  const barBox = await bar.boundingBox();
  expect(card!.y + card!.height).toBeLessThanOrEqual(barBox!.y);
});

test('control bar fits at phone width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openFirstPlaylist(page);
  const bar = page.getByTestId('control-bar');
  await expect(bar).toBeVisible();
  const buttons = bar.locator('button:visible');
  const n = await buttons.count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) {
    const box = await buttons.nth(i).boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(36);
  }
  const b = await bar.boundingBox();
  expect(b!.x + b!.width).toBeLessThanOrEqual(390);
});

test('on a short screen the whole video stays above the control bar', async ({ page }) => {
  await page.setViewportSize({ width: 1414, height: 662 });
  await openFirstPlaylist(page);
  const video = await page.getByTestId('player-frame').boundingBox();
  const bar = await page.getByTestId('control-bar').boundingBox();
  expect(video!.y + video!.height).toBeLessThanOrEqual(bar!.y);
  expect(Math.abs(video!.width / video!.height - 16 / 9)).toBeLessThan(0.02);
});
