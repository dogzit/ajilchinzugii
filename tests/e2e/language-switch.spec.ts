import { expect, test } from '@playwright/test';

/**
 * The switch must land on the same page in the other language — from either
 * language, on every page, by mouse and by keyboard.
 */
const paths = ['/', '/impact', '/methodology', '/research', '/policy', '/about'];
const pairs = [
  { from: 'mn', to: 'en', lang: 'en' },
  { from: 'en', to: 'mn', lang: 'mn-MN' },
] as const;

const url = (locale: string, path: string) => `/${locale}${path === '/' ? '' : path}`;

for (const { from, to, lang } of pairs) {
  test.describe(`${from} → ${to}`, () => {
    for (const path of paths) {
      test(`keeps the path for ${path}`, async ({ page }) => {
        await page.goto(url(from, path));

        const link = page.getByTestId('language-switch').first();
        // A real link, server-rendered: it works before any JavaScript runs.
        await expect(link).toHaveAttribute('href', url(to, path));

        await link.click();
        await expect(page).toHaveURL(url(to, path));
        await expect(page.locator('html')).toHaveAttribute('lang', lang);
      });
    }

    test('works by keyboard alone', async ({ page }) => {
      await page.goto(url(from, '/impact'));

      const link = page.getByTestId('language-switch').first();
      await link.focus();
      await expect(link).toBeFocused();
      await page.keyboard.press('Enter');

      await expect(page).toHaveURL(url(to, '/impact'));
    });
  });
}

test.describe('the copy button', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('copies the contact address with the keyboard', async ({ page }) => {
    await page.goto('/mn/about');

    const button = page
      .getByRole('button')
      .filter({ hasText: /Хуулах|Copy/ })
      .first();
    await button.focus();
    await expect(button).toBeFocused();
    await page.keyboard.press('Enter');

    const copied = await page.evaluate(() => navigator.clipboard.readText());
    const shown = await page.locator('.select-all').first().innerText();
    expect(copied.trim()).toBe(shown.trim());

    // The button says what happened, for a reader who cannot see the change.
    await expect(page.getByRole('status')).toContainText(/Хуулагдлаа|Copied/);
  });
});
