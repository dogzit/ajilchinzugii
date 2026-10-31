import { expect, test } from '@playwright/test';

/**
 * The front page: one h1, the sections in order, and the partner strip.
 */
test.describe('the home page', () => {
  test('has exactly one h1, and it is the mission line', async ({ page }) => {
    await page.goto('/mn');

    const headings = page.locator('main h1');
    await expect(headings).toHaveCount(1);
    await expect(headings.first()).toBeVisible();
    await expect(headings.first()).not.toBeEmpty();
  });

  test('every section is named for a screen reader', async ({ page }) => {
    await page.goto('/mn');

    for (const id of [
      'hero',
      'trust',
      'what-we-do',
      'figures',
      'story',
      'cta',
      'partners',
    ]) {
      const section = page.locator(`section[aria-labelledby="${id}"]`);
      await expect(section, id).toHaveCount(1);
      await expect(page.locator(`#${id}`), id).not.toBeEmpty();
    }
  });

  test('the call to action reaches the contact address', async ({ page }) => {
    await page.goto('/mn');

    const cta = page.locator('section[aria-labelledby="cta"] a').first();
    await expect(cta).toHaveAttribute('href', '/mn/about#contact');

    await cta.click();
    await expect(page.locator('#contact')).toBeVisible();
  });

  test('partner links open out safely and the duplicate is hidden', async ({ page }) => {
    await page.goto('/mn');

    const strip = page.locator('section[aria-labelledby="partners"]');
    const tracks = strip.locator('.marquee-track');
    await expect(tracks).toHaveCount(2);

    // The second copy exists only to make the loop seamless.
    await expect(tracks.nth(1)).toHaveAttribute('aria-hidden', 'true');

    const link = tracks.first().locator('a').first();
    if (await link.count()) {
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', /noopener/);
    }
  });
});

test.describe('the theme switch', () => {
  test('survives a reload', async ({ page }) => {
    await page.goto('/mn');

    const group = page.getByRole('group', { name: /харагдац/i });
    await group.getByRole('button').nth(2).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.reload();
    // The inline script runs before paint, so the mark is there immediately.
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('auto hands the decision back to the system', async ({ page }) => {
    await page.goto('/mn');

    const buttons = page.getByRole('group', { name: /харагдац/i }).getByRole('button');
    await buttons.nth(1).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await buttons.nth(0).click();
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.*/);
  });
});
