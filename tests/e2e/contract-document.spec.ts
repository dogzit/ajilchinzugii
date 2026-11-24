import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

/**
 * The document path: paste, photo and file, through the confirmation screen
 * to the result. The server runs the deterministic mock reader
 * (RATER_EXTRACTOR=mock) and the photo test installs a stand-in OCR engine,
 * so nothing here depends on a model or on reading a real photograph.
 * Every contract is synthetic (tests/fixtures/contracts/README.md).
 */

const fixture = (name: string) => `tests/fixtures/contracts/${name}`;
const cafe = readFileSync(fixture('01-cafe-printed.txt'), 'utf8');
const nightShift = readFileSync(fixture('10-phone-photo.txt'), 'utf8');

async function paste(page: Page, text: string) {
  await page.goto('/mn/contract-check');
  await page.getByRole('button', { name: /Гэрээний текст буулгах/ }).click();
  await page.getByLabel('Гэрээний текст').fill(text);
  await page.getByRole('button', { name: 'Уншуулах' }).click();
  await expect(page.getByRole('heading', { name: 'Уншсан мэдээллээ шалгана уу' })).toBeVisible();
}

async function confirm(page: Page) {
  await page.getByRole('group', { name: 'Хүсвэл ажлаасаа гарч чадах уу?' }).getByRole('radio', { name: 'Тийм' }).check();
  await page.getByRole('group', { name: 'Ажил дээрээ гэмтэж байсан уу?' }).getByRole('radio', { name: 'Үгүй' }).check();
  await page.getByRole('button', { name: 'Зөв байна, шалгах' }).click();
  await expect(page.getByText('100-аас')).toBeVisible();
}

const verdictOf = (page: Page, rule: string) => page.locator(`[data-rule="${rule}"]`).first().getAttribute('data-verdict');

test.describe('contract rater: documents', () => {
  test('pasted text is read, shown beside its excerpts, and rated', async ({ page }) => {
    await paste(page, cafe);
    const dob = page.locator('[data-field="worker.date_of_birth"]');
    await expect(dob.getByLabel('Төрсөн огноо')).toHaveValue('2010-03-14');
    await expect(dob.getByText(/төрсөн 2010 оны 3 сарын 14/)).toBeVisible();
    // The register number and phone were removed before reading.
    await expect(page.getByText('ЖШ 00000000')).toHaveCount(0);
    await page.getByRole('group', { name: 'Та ажил дээрээ юу хийдэг вэ?' }).getByRole('radio', { name: 'Кафе, ресторан' }).check();
    await confirm(page);
    await expect(page.getByText('Шар — тодруулах зүйл бий')).toBeVisible();
  });

  test('an edit on the confirmation screen changes the verdict', async ({ page }) => {
    await paste(page, nightShift);
    await confirm(page);
    expect(await verdictOf(page, 'M04_NIGHT_WORK')).toBe('red');

    await paste(page, nightShift);
    await page.locator('[data-field="schedule.end_time"]').getByLabel('Ажил дуусах цаг').fill('21:30');
    await page.locator('[data-field="schedule.start_time"]').getByLabel('Ажил эхлэх цаг').fill('16:30');
    await confirm(page);
    expect(await verdictOf(page, 'M04_NIGHT_WORK')).toBe('green');
  });

  test('the reality check rates the hours actually worked', async ({ page }) => {
    await paste(page, cafe);
    await page.getByRole('group', { name: 'Гэрээнд бичсэн цагаараа ажилладаг уу?' }).getByRole('radio', { name: 'Үгүй' }).check();
    await page.getByLabel('Бодитоор дуусах цаг').fill('23:00');
    await confirm(page);
    expect(await verdictOf(page, 'M04_NIGHT_WORK')).toBe('red');
    await expect(page.locator('[data-rule="M04_NIGHT_WORK"]').first()).toContainText('Таны бодит ажилласан цагаар тооцов');
  });

  test('a photo is read on the phone (mocked OCR) and only its text is sent', async ({ page }) => {
    await page.addInitScript((text) => {
      (window as unknown as { __AZ_OCR__: unknown }).__AZ_OCR__ = {
        recognize: async (_image: Blob, progress?: (p: number) => void) => {
          progress?.(1);
          return { text, confidence: 88 };
        },
      };
    }, nightShift);
    const bodies: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes('/api/rater/extract')) bodies.push(r.postData() ?? '');
    });
    await page.goto('/mn/contract-check');
    await page.getByRole('button', { name: /Зураг эсвэл файл оруулах/ }).click();
    await page.getByLabel('Зураг авах').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]) });
    await expect(page.getByRole('heading', { name: 'Уншсан мэдээллээ шалгана уу' })).toBeVisible();
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toContain('"text"');
    expect(bodies[0]).not.toContain('PNG');
  });

  test('a photo read with low confidence goes to the questionnaire', async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __AZ_OCR__: unknown }).__AZ_OCR__ = { recognize: async () => ({ text: 'бүдэг зураг', confidence: 31 }) };
    });
    await page.goto('/mn/contract-check');
    await page.getByRole('button', { name: /Зураг эсвэл файл оруулах/ }).click();
    await page.getByLabel('Зураг авах').setInputFiles({ name: 'dark.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff]) });
    const alert = page.getByRole('alert').filter({ hasText: 'Зургийг найдвартай уншиж чадсангүй' });
    await expect(alert).toBeVisible();
    await alert.getByRole('button', { name: 'Асуултад хариулах' }).click();
    await expect(page.getByRole('heading', { name: 'Та хэзээ төрсөн бэ?' })).toBeVisible();
  });

  test('a PDF is uploaded, read on the server and confirmed', async ({ page }) => {
    await page.goto('/mn/contract-check');
    await page.getByRole('button', { name: /Зураг эсвэл файл оруулах/ }).click();
    await page.getByLabel('Зураг, PDF эсвэл Word сонгох').setInputFiles(fixture('06-tutoring.pdf'));
    await expect(page.getByRole('heading', { name: 'Уншсан мэдээллээ шалгана уу' })).toBeVisible();
    await expect(page.locator('[data-field="pay.amount"]').getByRole('spinbutton')).toHaveValue('1200000');
    await confirm(page);
  });

  test('a Word file is uploaded and read', async ({ page }) => {
    await page.goto('/mn/contract-check');
    await page.getByRole('button', { name: /Зураг эсвэл файл оруулах/ }).click();
    await page.getByLabel('Зураг, PDF эсвэл Word сонгох').setInputFiles(fixture('09-service-contract.docx'));
    await expect(page.getByRole('heading', { name: 'Уншсан мэдээллээ шалгана уу' })).toBeVisible();
    await confirm(page);
    expect(await verdictOf(page, 'G02_DISGUISED_JOB')).toBe('yellow');
  });
});
