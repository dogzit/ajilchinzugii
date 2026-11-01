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

    // Wait for the page itself: until it lands, `main`'s child is the
    // outline its loading.tsx put there, which has its own animation.
    await expect(page.getByRole('heading', { level: 1, name: 'Аргачлал' })).toBeVisible();

    expect(await animation(page)).toEqual({
      name: 'page-enter',
      duration: '0.34s',
    });
  });

  test('a click is answered while the page it asked for is on its way', async ({
    page,
  }) => {
    // Hold every payload the router asks for — the prefetch as well as the
    // click, or the prefetch would have landed and there would be no wait at
    // all. This is the reader on the slow connection.
    await page.route(
      (url) => url.searchParams.has('_rsc'),
      async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        await route.continue();
      },
    );

    await page.goto('/mn');
    await page
      .getByRole('navigation', { name: 'Үндсэн цэс' })
      .getByRole('link', { name: 'Судалгаа' })
      .click();

    // Next keeps the reader on the page they are leaving until the next one
    // has arrived — the URL has not even changed yet — so the only thing
    // saying the click was heard is the line across the top.
    await expect(page.locator('html')).toHaveAttribute('data-nav-pending', '');
    const bar = page.locator('.nav-progress');
    await expect(bar).toHaveCSS('animation-name', 'nav-progress');
    // Drawn, but never part of the page: it cannot move a word.
    await expect(bar).toHaveCSS('position', 'fixed');

    // And it is gone the moment the page is there.
    await expect(page.getByRole('heading', { level: 1, name: 'Судалгаа' })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator('html')).not.toHaveAttribute('data-nav-pending', '');
  });

  test('every page that waits on data ships the outline it waits behind', async ({
    page,
  }) => {
    // The outline is a streaming fallback, so it is in the document before
    // the content that replaces it. It is reached on the renders that are
    // not already prerendered — a paper published since the last build, a
    // page found cold after revalidation.
    const html = await (await page.request.get('/mn/impact')).text();

    expect(html).toContain('data-testid="page-skeleton"');
    expect(html).toContain('aria-hidden="true"');
    // And the real figures are in the same document, for a crawler that
    // never runs a line of JavaScript.
    expect(html).toContain('Нөлөөлөл');
  });

  test('a heading linked to by its anchor clears the sticky header', async ({ page }) => {
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

  test('and the waiting outline does not breathe', async ({ page }) => {
    await page.goto('/mn');

    const duration = await page.evaluate(() => {
      // The outline is gone by the time the page is here, so ask the
      // stylesheet what it would have done.
      const bar = document.createElement('div');
      bar.className = 'skeleton';
      document.body.append(bar);
      const value = getComputedStyle(bar).animationDuration;
      bar.remove();
      return value;
    });

    expect(seconds(duration)).toBeLessThan(0.01);
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
 *
 * These also hold a rule that is easy to break by accident: no `loading.tsx`
 * may sit at the `[locale]` level. One there would wrap `[...rest]` too, and
 * a route that has begun streaming cannot go back and answer 404 — a missing
 * page would reply 200, and a search engine would index it as real.
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
