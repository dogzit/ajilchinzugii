import { expect, test } from '@playwright/test';

/**
 * The front page: one h1, the sections in order, and the partner strip.
 *
 * The appearance switch that also lives on this page is covered in
 * tests/e2e/theme.spec.ts.
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
      'evidence',
      'cta',
      'partners',
    ]) {
      const section = page.locator(`section[aria-labelledby="${id}"]`);
      await expect(section, id).toHaveCount(1);
      await expect(page.locator(`#${id}`), id).not.toBeEmpty();
    }
  });

  test('the two raters are the primary actions, in the hero and the closing band', async ({ page }) => {
    await page.goto('/mn');

    for (const section of ['hero', 'cta']) {
      const links = page.locator(`section[aria-labelledby="${section}"] a`);
      await expect(links.filter({ hasText: 'Гэрээгээ шалгуулах' })).toHaveAttribute('href', '/mn/contract-check');
      await expect(links.filter({ hasText: 'CV-гээ үнэлүүлэх' })).toHaveAttribute('href', '/mn/cv-check');
    }

    await page.goto('/en');
    await expect(page.locator('section[aria-labelledby="hero"] a', { hasText: 'Check my contract' })).toHaveAttribute('href', '/en/contract-check');
    await expect(page.locator('section[aria-labelledby="hero"] a', { hasText: 'Rate my CV' })).toHaveAttribute('href', '/en/cv-check');
  });

  test('the contact address and the impact figures stay one click away', async ({ page }) => {
    await page.goto('/mn');

    const contact = page.locator('header a[href="/mn/about#contact"]').first();
    await expect(contact).toHaveCount(1);
    await expect(page.locator('header a[href="/mn/impact"]').first()).toHaveCount(1);
    await expect(page.locator('footer a[href="/mn/impact"]').first()).toHaveCount(1);

    await page.goto('/mn/about#contact');
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
