import { expect, test } from '@playwright/test';

test('rail group opens with the keyboard, Esc closes and returns focus', async ({ page }) => {
  await page.goto('/');
  const btn = page.getByRole('navigation', { name: 'Categories' }).getByRole('button', { name: 'Languages' });
  await expect(async () => {
    await btn.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#rail-popover')).toBeVisible({ timeout: 500 });
  }).toPass();
  await expect(btn).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#rail-popover a').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#rail-popover')).toHaveCount(0);
  await expect(btn).toBeFocused();
});

test('rail popover closes when keyboard focus leaves the rail', async ({ page }) => {
  await page.goto('/');
  const btn = page.getByRole('navigation', { name: 'Categories' }).getByRole('button', { name: 'Languages' });
  await expect(async () => {
    await btn.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#rail-popover')).toBeVisible({ timeout: 500 });
  }).toPass();
  for (let i = 0; i < 40; i++) {
    const outside = await page.evaluate(
      () => !document.activeElement?.closest('#rail-popover') && !document.activeElement?.closest('nav[aria-label="Categories"]'),
    );
    if (outside) break;
    await page.keyboard.press('Tab');
  }
  await expect(page.locator('#rail-popover')).toHaveCount(0);
});

test('content starts below the language pill and scrolls under the floating rail', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  const card = await page.getByTestId('course-card').first().boundingBox();
  const chips = await page.locator('[aria-label="Language"]').boundingBox();
  const rail = await page.getByRole('navigation', { name: 'Categories' }).boundingBox();
  expect(card!.y).toBeGreaterThanOrEqual(chips!.y + chips!.height);
  // like the demo, the grid runs under the glass rail so it always has imagery to refract
  expect(card!.x).toBeLessThan(rail!.x + rail!.width);
});

test('phone width: rail hidden, drawer works, no runtime errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('div:has(> nav[aria-label="Categories"])').first()).toBeHidden();
  await expect(async () => {
    await page.getByRole('button', { name: 'Open categories' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 500 });
  }).toPass();
  await expect(page.getByRole('dialog').locator('a[href^="/c/"]').first()).toBeVisible();
  expect(errors).toEqual([]);
});
