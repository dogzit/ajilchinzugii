import { expect, test } from '@playwright/test';

const paths = ['/', '/impact', '/methodology', '/research', '/policy', '/about'];

for (const path of paths) {
  test(`language switch keeps the path for ${path}`, async ({ page }) => {
    await page.goto(`/mn${path === '/' ? '' : path}`);

    const toEnglish = page.getByTestId('language-switch').first();
    // A real link, not a script-driven control.
    await expect(toEnglish).toHaveAttribute('href', `/en${path === '/' ? '' : path}`);

    await toEnglish.click();
    await expect(page).toHaveURL(`/en${path === '/' ? '' : path}`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    // ...and back again, by keyboard this time.
    const toMongolian = page.getByTestId('language-switch').first();
    await toMongolian.focus();
    await expect(toMongolian).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(`/mn${path === '/' ? '' : path}`);
  });
}
