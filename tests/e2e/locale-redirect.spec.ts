import { expect, test } from '@playwright/test';

/**
 * `/` is never a page of its own: the middleware sends the reader to a
 * prefixed locale. Accept-Language is consulted on the first visit only —
 * after that the NEXT_LOCALE cookie (the reader's own choice) wins.
 */
test('sends a Mongolian browser to /mn', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'mn-MN' });
  const page = await context.newPage();
  await page.goto('/');

  await expect(page).toHaveURL(/\/mn$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'mn-MN');
  await context.close();
});

test('falls back to /mn for a browser that asks for neither language', async ({
  browser,
}) => {
  const context = await browser.newContext({ locale: 'fr-FR' });
  const page = await context.newPage();
  await page.goto('/');

  await expect(page).toHaveURL(/\/mn$/);
  await context.close();
});

test('honours Accept-Language on a first visit', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'en-GB' });
  const page = await context.newPage();
  await page.goto('/');

  await expect(page).toHaveURL(/\/en$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await context.close();
});

test('ignores Accept-Language once a locale has been chosen', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'en-GB' });
  await context.addCookies([
    { name: 'NEXT_LOCALE', value: 'mn', url: 'http://127.0.0.1:3000' },
  ]);
  const page = await context.newPage();
  await page.goto('/');

  await expect(page).toHaveURL(/\/mn$/);
  await context.close();
});
