import { expect, test } from '@playwright/test';

/**
 * The editors' handbook lives at /guide, outside the locale routing: every
 * other top-level path is treated as a locale and redirected to /mn/....
 */
test('the handbook opens at /guide without a locale redirect', async ({ page }) => {
  const response = await page.goto('/guide');

  expect(response?.status()).toBe(200);
  expect(page.url()).toMatch(/\/guide$/);
  await expect(page).toHaveTitle(/Редакторын гарын авлага/);
});

test('the handbook is kept out of search results', async ({ request }) => {
  const response = await request.get('/guide');
  expect(response.headers()['x-robots-tag']).toContain('noindex');

  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Disallow: /guide');
});
