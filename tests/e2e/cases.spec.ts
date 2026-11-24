import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

/**
 * Escalation: a red result → "Talk to Ajilchin Zugii" → the intake form →
 * a case number and a delete link → the delete page. This writes a case to
 * the database the server uses, so it runs only where the case keys are set
 * for a throwaway database (local runs), never against CI's database.
 */
const enabled = Boolean(process.env.CASE_FILES_KEY && process.env.CASE_TOKEN_SECRET) || existsLocalKeys();

function existsLocalKeys(): boolean {
  try {
    return /^CASE_FILES_KEY=.+/m.test(readFileSync('.env.local', 'utf8')) && /DATABASE_URL=.*(127\.0\.0\.1|localhost)/.test(readFileSync('.env.local', 'utf8'));
  } catch {
    return false;
  }
}

const nightShift = readFileSync('tests/fixtures/contracts/10-phone-photo.txt', 'utf8');

test('a red result opens a case, gives a delete link, and the link deletes it', async ({ page }) => {
  test.skip(!enabled, 'needs CASE_FILES_KEY, CASE_TOKEN_SECRET and a throwaway database');
  await page.goto('/mn/contract-check');
  await page.getByRole('button', { name: /Гэрээний текст буулгах/ }).click();
  await page.getByLabel('Гэрээний текст').fill(nightShift);
  await page.getByRole('button', { name: 'Уншуулах' }).click();
  await page.getByRole('group', { name: 'Хүсвэл ажлаасаа гарч чадах уу?' }).getByRole('radio', { name: 'Тийм' }).check();
  await page.getByRole('group', { name: 'Ажил дээрээ гэмтэж байсан уу?' }).getByRole('radio', { name: 'Үгүй' }).check();
  await page.getByRole('button', { name: 'Зөв байна, шалгах' }).click();

  await page.getByRole('button', { name: 'Тусламж хүсэх' }).click();
  await expect(page.getByText('Хариу: 3 хоногийн дотор')).toBeVisible();
  // Opt-in storage starts unticked.
  await expect(page.getByLabel(/Ажилчин Зөгий надад туслахын тулд хадгал/)).not.toBeChecked();
  await page.getByRole('group', { name: 'Холбогдох арга' }).getByRole('radio', { name: 'Утас' }).check();
  await page.getByLabel('Утасны дугаар эсвэл Facebook хаяг').fill('9900 0099');
  await page.getByLabel('Ажилчин Зөгий надтай холбогдохыг зөвшөөрч байна.').check();
  await page.getByLabel(/Ажилчин Зөгий надад туслахын тулд хадгал/).check();
  await page.getByRole('button', { name: 'Илгээх' }).click();

  await expect(page.getByRole('heading', { name: 'Хүлээн авлаа' })).toBeVisible();
  const link = (await page.locator('main p.select-all').textContent()) ?? '';
  expect(link).toMatch(/\/mn\/case-delete#AZ-\d{6}-[A-Z0-9]{4}\./);
  // Nothing personal in the address bar.
  expect(page.url()).toMatch(/\/mn\/contract-check$/);

  await page.goto(link.replace(/^https?:\/\/[^/]+/, ''));
  await page.getByRole('button', { name: 'Устгах' }).click();
  await expect(page.getByText('Устгагдлаа. Таны хэргийн мэдээлэл үлдээгүй.')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Устгах' }).click();
  await expect(page.getByText(/Холбоос хүчингүй/)).toBeVisible();
});
