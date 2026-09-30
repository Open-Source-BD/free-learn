import { expect, test } from '@playwright/test';

test('home shows topic rows whose "View all" opens the category', async ({ page }) => {
  await page.goto('/');
  const shelves = page.getByTestId('shelf');
  await expect(shelves.first()).toBeVisible();
  expect(await shelves.count()).toBeGreaterThanOrEqual(5);
  const viewAll = shelves.first().getByRole('link', { name: /View all/ });
  const href = await viewAll.getAttribute('href');
  expect(href).toMatch(/^\/c\//);
  await viewAll.click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
});

test('row arrows slide the row and disable at the start', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  const shelf = page.getByTestId('shelf').first();
  const prev = shelf.getByRole('button', { name: 'Previous' });
  const next = shelf.getByRole('button', { name: 'Next' });
  await expect(prev).toBeDisabled();
  await expect(async () => {
    await next.click();
    await expect(prev).toBeEnabled({ timeout: 1000 });
  }).toPass();
  const scrolled = await shelf.getByTestId('shelf-track').evaluate((el) => el.scrollLeft);
  expect(scrolled).toBeGreaterThan(0);
});

test('sort is kept in the URL and restored on reload', async ({ page }) => {
  await page.goto('/?lang=en');
  const sort = page.getByLabel('Sort courses');
  await expect(async () => {
    await sort.selectOption('short');
    await expect(page).toHaveURL(/sort=short/, { timeout: 1000 });
  }).toPass();
  await expect(page).toHaveURL(/lang=en/);
  await page.reload();
  await expect(sort).toHaveValue('short');
});

test('language filter narrows the topic rows too', async ({ page }) => {
  await page.goto('/');
  await expect(async () => {
    await page.getByRole('radio', { name: 'বাংলা' }).click();
    await expect(page).toHaveURL(/lang=bn/, { timeout: 1000 });
  }).toPass();
  const metas = await page.getByTestId('shelf').getByTestId('course-meta').allTextContents();
  expect(metas.length).toBeGreaterThan(0);
  for (const m of metas) expect(m).toContain('বাংলা');
});
