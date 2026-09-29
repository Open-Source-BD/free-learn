import { expect, test } from '@playwright/test';

const pill = (page: import('@playwright/test').Page) => page.locator('header [data-liquid-glass]').first();

test('top bar uses the SVG liquid glass filter in Chromium', async ({ page }) => {
  await page.goto('/');
  await expect(pill(page)).toHaveAttribute('data-liquid-glass', 'svg');
  await expect(pill(page).locator('filter feDisplacementMap')).toHaveCount(1);
  const id = await pill(page).locator('filter').getAttribute('id');
  const bf = await pill(page).locator('[data-glass-lens]').evaluate((el) => getComputedStyle(el).backdropFilter);
  expect(bf).toContain(`#${id}`);
});

test('rebuilds the map when the pill resizes', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/');
  await expect(pill(page)).toHaveAttribute('data-liquid-glass', 'svg');
  await page.setViewportSize({ width: 1000, height: 900 });
  await expect
    .poll(async () => {
      const w = await pill(page).evaluate((el) => Math.round((el as HTMLElement).offsetWidth));
      const fe = await pill(page).locator('feImage').first().getAttribute('width');
      return Number(fe) === w;
    })
    .toBe(true);
});

test('reduced motion falls back to CSS glass', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(pill(page)).toHaveAttribute('data-liquid-glass', 'css');
  await expect(pill(page).locator('filter')).toHaveCount(0);
  await expect(pill(page).locator('[data-glass-lens]')).toHaveClass(/\bglass\b/);
});
