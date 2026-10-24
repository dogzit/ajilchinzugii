import { expect, test } from '@playwright/test';

/**
 * Mobile first, checked rather than assumed: at every width the page must not
 * scroll sideways, and the side gutter must survive.
 */
const widths = [
  { name: 'phone', width: 360, height: 780 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 900 },
];

const paths = ['/', '/impact', '/methodology', '/research', '/policy', '/about'];

for (const { name, width, height } of widths) {
  test.describe(`${name} (${width}px)`, () => {
    test.use({ viewport: { width, height } });

    for (const path of paths) {
      test(`${path} does not scroll sideways`, async ({ page }) => {
        await page.goto(`/mn${path === '/' ? '' : path}`);

        const { scrollWidth, innerWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        }));

        // One pixel of slack for sub-pixel rounding.
        expect(scrollWidth, `${path} at ${width}px`).toBeLessThanOrEqual(innerWidth + 1);
      });
    }

    test('the header and its controls stay inside the viewport', async ({ page }) => {
      await page.goto('/mn');

      for (const selector of ['header', 'main', 'footer']) {
        const box = await page.locator(selector).first().boundingBox();
        expect(box, selector).not.toBeNull();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
      }
    });
  });
}

test.describe('the chart at phone width', () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test('fits the column and keeps its data table reachable', async ({ page }) => {
    await page.goto('/mn/impact');

    const chart = page.locator('svg[role="img"]').first();
    const hasChart = (await chart.count()) > 0;
    test.skip(!hasChart, 'no monthly figures in this environment');

    const box = await chart.boundingBox();
    expect(box!.width).toBeLessThanOrEqual(360);

    // The numbers behind the drawing are always available as a real table.
    const details = page
      .locator('details')
      .filter({ hasText: /хүснэгт/i })
      .first();
    await details.locator('summary').click();
    await expect(details.locator('table')).toBeVisible();
  });
});

test.describe('the mobile menu', () => {
  test.use({ viewport: { width: 360, height: 780 } });

  test('opens by keyboard and lists every page', async ({ page }) => {
    await page.goto('/mn');

    const menu = page.locator('details').first();
    const summary = menu.locator('summary');

    await summary.focus();
    await page.keyboard.press('Enter');

    await expect(menu.locator('nav a')).toHaveCount(6);
    await expect(menu.locator('nav a').first()).toBeVisible();
  });
});
