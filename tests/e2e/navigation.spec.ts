import { expect, test, type Page } from '@playwright/test';

/**
 * Moving around the site: what stays, what moves, and what a reader who has
 * asked for less motion gets instead.
 */

/** Chrome writes a cut-to-nothing duration as "1e-05s". */
const seconds = (value?: string | null) => Number.parseFloat(value ?? '0');

const animation = (page: Page) =>
  page.evaluate(() => {
    const first = document.querySelector('main > *');
    if (!first) return null;
    const style = getComputedStyle(first);
    return { name: style.animationName, duration: style.animationDuration };
  });

test.describe('between pages', () => {
  test('the frame holds still and the content comes in', async ({ page }) => {
    await page.goto('/mn');

    const header = page.locator('body > header');
    const footer = page.locator('body > footer');
    await expect(header).toBeVisible();

    await page
      .getByRole('navigation', { name: 'Үндсэн цэс' })
      .getByRole('link', { name: 'Аргачлал' })
      .click();

    await expect(page).toHaveURL('/mn/methodology');
    // A client-side navigation: the header and footer are never re-fetched,
    // and the reader keeps their place in the page frame.
    await expect(header).toBeVisible();
    await expect(footer).toBeAttached();

    expect(await animation(page)).toEqual({
      name: 'page-enter',
      duration: '0.34s',
    });
  });

  test('a heading linked to by its anchor clears the sticky header', async ({
    page,
  }) => {
    await page.goto('/mn/impact');

    const link = page.locator('a[href*="/mn/methodology#"]').first();
    const href = await link.getAttribute('href');
    const anchor = href?.split('#')[1] as string;

    await link.click();
    await expect(page).toHaveURL(`/mn/methodology#${anchor}`);

    const heading = page.locator(`#${anchor}`);
    const [headingBox, headerBox] = await Promise.all([
      heading.boundingBox(),
      page.locator('body > header').boundingBox(),
    ]);

    // Landing underneath the header is the reader arriving at a heading they
    // cannot see; scroll-margin-top is what keeps it clear.
    expect(headingBox?.y ?? 0).toBeGreaterThan(
      (headerBox?.y ?? 0) + (headerBox?.height ?? 0),
    );
  });

  test('the language switch keeps the anchor the reader is standing on', async ({
    page,
  }) => {
    await page.goto('/mn/methodology#counting');

    await page.getByTestId('language-switch').first().click();

    await expect(page).toHaveURL('/en/methodology#counting');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});

test.describe('asked for less motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the page simply appears', async ({ page }) => {
    await page.goto('/mn');
    const state = await animation(page);

    // The rule is still there; the global reduced-motion block cuts it to
    // nothing, which is what the reader asked for.
    expect(state?.name).toBe('page-enter');
    expect(seconds(state?.duration)).toBeLessThan(0.01);
  });

  test('and the partner strip stops sliding', async ({ page }) => {
    await page.goto('/mn');

    const track = page.locator('.marquee-track').first();
    const duration = await track.evaluate(
      (element) => getComputedStyle(element).animationDuration,
    );

    expect(seconds(duration)).toBeLessThan(0.01);
  });
});

/**
 * A page that is not there still has to be this site, in this language.
 */
test.describe('a page that does not exist', () => {
  const cases = [
    { path: '/mn/no-such-page', heading: 'Хуудас олдсонгүй', lang: 'mn-MN' },
    { path: '/en/no-such-page', heading: 'Page not found', lang: 'en' },
    // A paper slug nobody has: the page itself calls notFound().
    { path: '/mn/research/no-such-paper', heading: 'Хуудас олдсонгүй', lang: 'mn-MN' },
  ];

  for (const { path, heading, lang } of cases) {
    test(`answers ${path} with a 404 and a way back`, async ({ page }) => {
      const response = await page.goto(path);

      expect(response?.status()).toBe(404);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
      await expect(page.locator('html')).toHaveAttribute('lang', lang);

      // The site is still around it: header, footer, language switch.
      await expect(page.locator('body > header')).toBeVisible();
      await expect(page.getByTestId('language-switch').first()).toBeVisible();

      // Never indexed, whatever the flag says.
      await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
        'content',
        /noindex/,
      );
    });
  }
});
