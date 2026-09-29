import { expect, test } from '@playwright/test';

test('home lists courses and language chips filter them', async ({ page }) => {
  await page.goto('/');
  const cards = page.getByTestId('course-card');
  await expect(cards.first()).toBeVisible();

  await page.getByRole('radio', { name: 'বাংলা' }).click();
  await expect(page).toHaveURL(/\?lang=bn/);
  const metas = await page.getByTestId('course-meta').allTextContents();
  expect(metas.length).toBeGreaterThan(0);
  for (const m of metas) expect(m).toContain('বাংলা');

  await page.getByRole('button', { name: 'Playlists' }).click();
  await expect(page).toHaveURL(/lang=bn&type=playlist/);
  const badges = await page.getByTestId('course-badge').allTextContents();
  for (const b of badges) expect(b).toMatch(/^▶ \d+$/);
});

test('filter state survives reload from the URL', async ({ page }) => {
  await page.goto('/?lang=hi');
  await expect(page.getByRole('radio', { name: 'हिन्दी' })).toHaveAttribute('data-state', 'on');
});

test('category page shows only that category', async ({ page }) => {
  await page.goto('/');
  const link = page.getByRole('navigation', { name: 'Categories' }).locator('a[href^="/c/"]').first();
  const name = (await link.locator('span').first().textContent())!.trim();
  await link.click();
  await expect(page).toHaveURL(/\/c\//);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(name);
  await expect(page.getByTestId('course-card').first()).toBeVisible();
});

test('search opens with the keyboard and navigates to a course', async ({ page }) => {
  await page.goto('/');
  const input = page.getByPlaceholder('Search courses, authors, topics…');
  // The shortcut listener attaches on hydration; retry the keypress until the dialog opens.
  await expect(async () => {
    await page.keyboard.press('ControlOrMeta+k');
    await expect(input).toBeVisible({ timeout: 500 });
  }).toPass();
  await input.fill('python');
  await page.getByRole('option').first().click();
  await expect(page).toHaveURL(/\/watch\/[a-z0-9-]+-[0-9a-f]{6}|youtube\.com/);
});
