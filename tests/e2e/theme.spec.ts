import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

/**
 * The reader's appearance choice: light unless they say otherwise, and theirs
 * to keep — through a language switch, a page change and a reload.
 *
 * The palettes are read out of globals.css rather than written here, so these
 * tests check that the page is painted light or dark, not that it is painted
 * one particular cream.
 */

const css = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8');

function backgroundToken(theme: 'light' | 'dark'): string {
  const start = css.indexOf(`/* tokens:${theme} */`);
  const block = css.slice(start, css.indexOf('/* tokens:', start + 10));
  const match = block.match(/--bg:\s*(#[0-9a-f]{6})/);
  if (!match?.[1]) throw new Error(`no --bg in the ${theme} tokens`);
  return match[1];
}

const LIGHT = backgroundToken('light');
const DARK = backgroundToken('dark');

/** What the page is actually painted with, whatever the attribute says. */
const painted = (page: Page) =>
  page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(),
  );

const group = (page: Page) => page.getByRole('group', { name: /харагдац|appearance/i });
/** Light, dark, auto — the order they are offered in. */
const option = (page: Page, name: 'light' | 'dark' | 'auto') =>
  group(page)
    .getByRole('button')
    .nth({ light: 0, dark: 1, auto: 2 }[name]);

test.describe('a first visit', () => {
  test.use({ colorScheme: 'dark' });

  test('is light even when the system asks for dark', async ({ page }) => {
    await page.goto('/mn');

    // Light is the absence of a mark, so there is nothing for the inline
    // script to write and nothing to flash.
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.*/);
    expect(await painted(page)).toBe(LIGHT);
  });
});

test.describe('a chosen theme', () => {
  test('survives a reload', async ({ page }) => {
    await page.goto('/mn');
    await option(page, 'dark').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.reload();
    // The inline script runs before paint, so the mark is there immediately.
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await painted(page)).toBe(DARK);
  });

  test('survives a language switch, and the reload after it', async ({ page }) => {
    await page.goto('/mn/methodology');
    await option(page, 'dark').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.getByTestId('language-switch').first().click();

    await expect(page).toHaveURL('/en/methodology');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await painted(page)).toBe(DARK);

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('survives moving between pages', async ({ page }) => {
    await page.goto('/mn');
    await option(page, 'dark').click();

    await page
      .getByRole('navigation', { name: 'Үндсэн цэс' })
      .getByRole('link', { name: 'Судалгаа' })
      .click();
    await expect(page).toHaveURL(/\/mn\/research/);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('is kept by the switch itself after a language switch', async ({ page }) => {
    await page.goto('/mn');
    await option(page, 'dark').click();

    await page.getByTestId('language-switch').first().click();
    await expect(page).toHaveURL('/en');

    // The control must agree with the colours on screen, or the reader is
    // told they are on light while reading a dark page.
    await expect(option(page, 'dark')).toHaveAttribute('aria-pressed', 'true');
    await expect(option(page, 'light')).toHaveAttribute('aria-pressed', 'false');
  });
});

test.describe('auto', () => {
  test('follows the system setting, both ways', async ({ page }) => {
    await page.goto('/mn');
    await option(page, 'auto').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'auto');

    await page.emulateMedia({ colorScheme: 'dark' });
    expect(await painted(page)).toBe(DARK);

    await page.emulateMedia({ colorScheme: 'light' });
    expect(await painted(page)).toBe(LIGHT);
  });

  test('is still auto on the next page, and still follows the system', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/mn');
    await option(page, 'auto').click();

    await page.getByTestId('language-switch').first().click();
    await expect(page).toHaveURL('/en');

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'auto');
    expect(await painted(page)).toBe(DARK);
  });
});

test('the console stays clean through a themed language switch', async ({ page }) => {
  const complaints: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      complaints.push(message.text());
    }
  });
  page.on('pageerror', (error) => complaints.push(error.message));

  await page.goto('/mn/methodology');
  await option(page, 'dark').click();
  await page.getByTestId('language-switch').first().click();
  await expect(page).toHaveURL('/en/methodology');
  await page.reload();

  // Hydration mismatches arrive here, and so would a theme written during
  // render instead of in an effect.
  expect(complaints).toEqual([]);
});
