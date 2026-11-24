import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

/** The CV rater, profile to result, on the mock reader. Synthetic CVs only. */

const good = readFileSync('tests/fixtures/cvs/good-cv.txt', 'utf8');
const oversharing = readFileSync('tests/fixtures/cvs/oversharing-cv.txt', 'utf8');

async function rate(page: Page, age: string, job: string, cv: string) {
  await page.goto('/mn/cv-check');
  await page.getByRole('group', { name: 'Насны бүлэг' }).getByRole('radio', { name: age }).check();
  await page.getByRole('group', { name: 'Зорьж буй ажил' }).getByRole('radio', { name: job }).check();
  await page.getByRole('group', { name: 'CV-д тань өөрийн зураг байгаа юу?' }).getByRole('radio', { name: 'Үгүй' }).check();
  await page.getByRole('button', { name: 'Үргэлжлүүлэх' }).click();
  await page.getByLabel('CV-ийн текст').fill(cv);
  await page.getByRole('button', { name: 'Үнэлүүлэх' }).click();
  await expect(page.getByText('100-аас')).toBeVisible();
}

test.describe('CV rater', () => {
  test('a good CV for a café job, with suggestions quoting the CV', async ({ page }) => {
    await rate(page, '18–24', 'Кафе, ресторан', good);
    await expect(page.locator('[data-rule="C04_SKILLS_MATCH"]')).toHaveAttribute('data-verdict', 'green');
    await expect(page.getByText(/Ажилчин Зөгийн ажилтан хараахан хянаагүй ноорог/)).toBeVisible();
  });

  test('a 16-year-old sharing a register number and home address gets red', async ({ page }) => {
    await rate(page, '15–17', 'Оффис, дадлага', oversharing);
    const score = Number(await page.locator('[data-score]').getAttribute('data-score'));
    expect(score).toBeLessThan(40);
    await expect(page.locator('[data-rule="C02_OVERSHARING"]')).toHaveAttribute('data-verdict', 'red');
    await expect(page.getByText('Регистрийн дугаар бичигдсэн байна.')).toBeVisible();
    // The register number itself never comes back.
    await expect(page.getByText('11111111')).toHaveCount(0);
  });
});
