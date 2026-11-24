import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

/**
 * WCAG 2.1 AA on every state of the raters, not only their first screen:
 * a question, the confirmation screen, a red result with the 108 callout,
 * the intake form, the CV profile and the CV result — light and dark.
 */

const analyse = async (page: Page) => {
  await page.waitForFunction(() =>
    document.getAnimations().filter((a) => a.playState === 'running').every((a) => a.effect?.getTiming().iterations === Infinity),
  );
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  return violations.map((v) => `${v.id}: ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`);
};

const cafe = readFileSync('tests/fixtures/contracts/01-cafe-printed.txt', 'utf8');
const good = readFileSync('tests/fixtures/cvs/good-cv.txt', 'utf8');

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`rater states, ${scheme}`, () => {
    test.use({ colorScheme: scheme });
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((s) => localStorage.setItem('theme', s), scheme);
    });

    test('questionnaire: a question, then a red result with 108, then the intake form', async ({ page }) => {
      await page.goto('/mn/contract-check');
      await page.getByRole('button', { name: /Асуултад хариулах/ }).click();
      await page.getByRole('button', { name: 'Үргэлжлүүлэх' }).click();
      expect(await analyse(page), 'question').toEqual([]);
      for (let i = 0; i < 12; i += 1) await page.getByRole('button', { name: /Үргэлжлүүлэх/ }).click();
      await page.getByRole('group', { name: 'Хүсвэл ажлаасаа гарч чадах уу?' }).getByRole('radio', { name: 'Үгүй' }).check();
      await page.getByRole('button', { name: 'Үргэлжлүүлэх' }).click();
      await page.getByRole('button', { name: 'Шалгах' }).click();
      await expect(page.getByRole('link', { name: '108 руу залгах' })).toBeVisible();
      expect(await analyse(page), 'results').toEqual([]);
      await page.getByRole('button', { name: 'Тусламж хүсэх' }).click();
      expect(await analyse(page), 'intake').toEqual([]);
    });

    test('document: the confirmation screen', async ({ page }) => {
      await page.goto('/mn/contract-check');
      await page.getByRole('button', { name: /Гэрээний текст буулгах/ }).click();
      expect(await analyse(page), 'paste').toEqual([]);
      await page.getByLabel('Гэрээний текст').fill(cafe);
      await page.getByRole('button', { name: 'Уншуулах' }).click();
      await expect(page.getByRole('heading', { name: 'Уншсан мэдээллээ шалгана уу' })).toBeVisible();
      expect(await analyse(page), 'confirm').toEqual([]);
    });

    test('CV: profile and result', async ({ page }) => {
      await page.goto('/mn/cv-check');
      expect(await analyse(page), 'profile').toEqual([]);
      await page.getByRole('group', { name: 'Насны бүлэг' }).getByRole('radio', { name: '18–24' }).check();
      await page.getByRole('group', { name: 'Зорьж буй ажил' }).getByRole('radio', { name: 'Кафе, ресторан' }).check();
      await page.getByRole('button', { name: 'Үргэлжлүүлэх' }).click();
      await page.getByLabel('CV-ийн текст').fill(good);
      await page.getByRole('button', { name: 'Үнэлүүлэх' }).click();
      await expect(page.getByText('100-аас')).toBeVisible();
      expect(await analyse(page), 'cv result').toEqual([]);
    });

    test('the case delete page', async ({ page }) => {
      await page.goto('/mn/case-delete');
      expect(await analyse(page)).toEqual([]);
    });
  });
}
