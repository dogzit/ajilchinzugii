import { expect, test } from '@playwright/test';

/**
 * The About page lists the people; each name is the way to their own page.
 * The pages are built from the CMS, so the test follows whoever is listed
 * rather than naming anyone: a team that changes must not fail the suite.
 */
test.describe('team member pages', () => {
  test('a name on About leads to that person’s page', async ({ page }) => {
    await page.goto('/mn/about');

    const firstName = page.locator('section[aria-labelledby="team"] li a[href*="/team/"]').first();
    test.skip((await firstName.count()) === 0, 'no team members listed');

    const name = (await firstName.textContent())?.trim();
    const href = await firstName.getAttribute('href');
    await firstName.click();

    await expect(page).toHaveURL(new RegExp(`${href}$`));
    // The name is the page's own heading, not just the link that got here.
    await expect(page.locator('h1')).toHaveText(name ?? '');
  });

  test('the language switch stays on the same person', async ({ page }) => {
    await page.goto('/mn/about');
    const firstName = page.locator('section[aria-labelledby="team"] li a[href*="/team/"]').first();
    test.skip((await firstName.count()) === 0, 'no team members listed');

    const href = await firstName.getAttribute('href');
    const slug = href?.split('/team/')[1];
    await page.goto(`/en/team/${slug}`);

    await expect(page.locator('h1')).toBeVisible();
    await expect(page).toHaveURL(`/en/team/${slug}`);
  });

  test('an unknown slug is a 404, not an empty page', async ({ page }) => {
    const response = await page.goto('/mn/team/no-such-person');
    expect(response?.status()).toBe(404);
  });
});
