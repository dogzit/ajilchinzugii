import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * WCAG 2.1 AA, checked on every page in both languages and in both colour
 * schemes (CLAUDE.md rule 7). Any violation fails: an accessibility rule that
 * only warns is a rule nobody fixes.
 */

const paths = ['/', '/impact', '/methodology', '/research', '/policy', '/about'];
const locales = ['mn', 'en'] as const;
const schemes = ['light', 'dark'] as const;

const analyse = (page: Page) =>
  new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

const describeViolations = (
  violations: Awaited<ReturnType<typeof analyse>>['violations'],
) =>
  violations
    .map(
      (v) =>
        `${v.id} (${v.impact}): ${v.help}\n    ${v.nodes
          .slice(0, 3)
          .map((n) => n.target.join(' '))
          .join('\n    ')}`,
    )
    .join('\n  ');

for (const scheme of schemes) {
  test.describe(`${scheme} scheme`, () => {
    test.use({ colorScheme: scheme });

    for (const locale of locales) {
      for (const path of paths) {
        test(`${locale}${path} has no WCAG violations`, async ({ page }) => {
          await page.goto(`/${locale}${path === '/' ? '' : path}`);
          const { violations } = await analyse(page);

          expect(violations.length, `\n  ${describeViolations(violations)}\n`).toBe(0);
        });
      }
    }
  });
}

test.describe('the details a scan cannot see', () => {
  test('the skip link is first, and moves focus into main', async ({ page }) => {
    await page.goto('/mn');

    await page.keyboard.press('Tab');
    const skip = page.locator(':focus');
    await expect(skip).toHaveAttribute('href', '#main');
    await expect(skip).toBeVisible();

    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();
  });

  test('focus is visible on every control along the way', async ({ page }) => {
    await page.goto('/mn');

    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press('Tab');
      // Read the active element directly: a `:focus` locator waits for a match
      // and stalls the test when focus leaves the document.
      const outline = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const style = getComputedStyle(el);
        return { width: style.outlineWidth, style: style.outlineStyle, tag: el.tagName };
      });
      if (!outline) continue;
      expect(
        outline.style !== 'none' && parseFloat(outline.width) > 0,
        `no visible focus ring on ${outline.tag}`,
      ).toBe(true);
    }
  });

  test('every nav link and the language switch are reachable by keyboard alone', async ({
    page,
  }) => {
    await page.goto('/mn');

    const reachable = new Set<string>();
    for (let i = 0; i < 40; i += 1) {
      await page.keyboard.press('Tab');
      const href = await page.evaluate(
        () => document.activeElement?.getAttribute('href') ?? null,
      );
      if (href) reachable.add(href);
    }

    for (const path of [
      '/mn',
      '/mn/impact',
      '/mn/methodology',
      '/mn/research',
      '/mn/policy',
      '/mn/about',
    ]) {
      expect([...reachable], `${path} not reachable by keyboard`).toContain(path);
    }
    expect([...reachable].some((href) => href.startsWith('/en'))).toBe(true);
  });
});
