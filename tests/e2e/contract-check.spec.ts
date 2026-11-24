import { expect, test, type Page } from '@playwright/test';

/**
 * The contract rater's no-contract path, end to end: the 15 questions, the
 * result, and the actions under it. Every answer here is invented.
 */

type Step = (page: Page) => Promise<void>;

const radio = (page: Page, group: string, option: string) =>
  page.getByRole('group', { name: group }).getByRole('radio', { name: option, exact: true }).check();

const next = (page: Page) => page.getByRole('button', { name: /Үргэлжлүүлэх|Шалгах/ }).click();

/** A 15-year-old herding helper paid in food and lodging, no contract. */
const herdingHelper: Step[] = [
  (p) => p.getByLabel('Төрсөн огноо').fill('2011-03-01'),
  (p) => radio(p, 'Та ажил дээрээ юу хийдэг вэ?', 'Малчны туслах'),
  (p) => radio(p, 'Таныг хэн ажиллуулдаг вэ?', 'Хувь хүн эсвэл гэр бүл (жишээ нь малчин айл)'),
  async (p) => {
    await radio(p, 'Бичгээр байгуулсан гэрээ бий юу?', 'Үгүй');
    await p.getByLabel('Хэзээ ажиллаж эхэлсэн (эсвэл эхлэх) вэ?').fill('2026-06-01');
  },
  (p) => p.getByLabel('Өдрийн тоо').fill('7'),
  async (p) => {
    await p.getByLabel('Эхлэх').fill('06:00');
    await p.getByLabel('Дуусах').fill('21:00');
    await p.getByLabel('Завсарлага (минут)').fill('60');
  },
  (p) => radio(p, 'Илүү цагаар ажилладаг уу?', 'Үгүй'),
  async (p) => {
    await radio(p, 'Гэрээсээ хол газар ээлжээр (вахтаар) ажилладаг уу?', 'Үгүй');
    await radio(p, 'Ажлаар өөр хот, аймаг руу томилолтоор явдаг уу?', 'Үгүй');
  },
  (p) => radio(p, 'Юугаар нь тооцдог вэ?', 'Хоол, байраар (мөнгө өгдөггүй)'),
  (p) => radio(p, 'Цалингаа хэр олон удаа авдаг вэ?', 'Мэдэхгүй'),
  (p) => radio(p, 'Туршилтын хугацаа байсан уу?', 'Үгүй'),
  (p) => radio(p, 'Цалингаас тань мөнгө суутгадаг уу?', 'Үгүй'),
  (p) => radio(p, 'Ажил олгогч таны иргэний үнэмлэх эсвэл бусад бичиг баримтыг барьж байдаг уу?', 'Үгүй'),
  (p) => radio(p, 'Хүсвэл ажлаасаа гарч чадах уу?', 'Тийм'),
  (p) => radio(p, 'Ажил дээрээ гэмтэж байсан уу?', 'Үгүй'),
];

async function answerAll(page: Page, steps: Step[]) {
  await page.goto('/mn/contract-check');
  await page.getByRole('button', { name: /Асуултад хариулах/ }).click();
  for (const step of steps) {
    await step(page);
    await next(page);
  }
  await expect(page.getByText('100-аас')).toBeVisible();
}

test.describe('contract rater: questionnaire', () => {
  test('a herding helper paid in food: red, P1, 108 at once, red items first', async ({ page }) => {
    await answerAll(page, herdingHelper);

    // The score sits in the red band and the verdict says so in words.
    const score = Number(await page.locator('[data-score]').getAttribute('data-score'));
    expect(score).toBeLessThanOrEqual(10);
    await expect(page.getByText('Улаан — хууль зөрчиж байна')).toBeVisible();

    // P1: the helpline, straight away, never behind a login.
    await expect(page.getByRole('link', { name: '108 руу залгах' })).toHaveAttribute('href', 'tel:108');

    // Red items before yellow ones, and the explanation word for word from rules.yaml.
    const verdicts = await page.locator('ol [data-verdict]').evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-verdict')));
    const firstYellow = verdicts.indexOf('yellow');
    expect(verdicts.lastIndexOf('red')).toBeLessThan(firstYellow === -1 ? Infinity : firstYellow);
    await expect(page.locator('[data-rule="Q01_UNPAID"]')).toContainText('Зөвхөн хоол, байраар «цалинжуулах»');

    // The draft notice is shown while rules are unverified.
    await expect(page.getByText(/хуульчаар хараахан хянагдаагүй ноорог/).first()).toBeVisible();

    // "Talk to Ajilchin Zugii" is offered on a red result.
    await expect(page.getByRole('button', { name: 'Тусламж хүсэх' })).toBeVisible();

    // No personal data in the URL.
    expect(page.url()).toMatch(/\/mn\/contract-check$/);
  });

  test('the employer message is drafted and can be copied', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await answerAll(page, herdingHelper);
    await page.getByRole('button', { name: 'Захидал бичүүлэх' }).click();
    const text = page.getByLabel('Захидлын текст');
    await expect(text).toContainText('Хөдөлмөрийн тухай хууль');
    await page.getByRole('button', { name: 'Хуулах' }).click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain('Сайн байна уу');
  });

  test('the corrected template downloads as a PDF', async ({ page }) => {
    await answerAll(page, herdingHelper);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'PDF татах' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe('contract-template.pdf');
  });

  test('Back keeps the answers', async ({ page }) => {
    await page.goto('/mn/contract-check');
    await page.getByRole('button', { name: /Асуултад хариулах/ }).click();
    await page.getByLabel('Төрсөн огноо').fill('2011-03-01');
    await next(page);
    await page.getByRole('button', { name: 'Буцах' }).click();
    await expect(page.getByLabel('Төрсөн огноо')).toHaveValue('2011-03-01');
  });

  test('the whole questionnaire works from the keyboard', async ({ page }) => {
    await page.goto('/mn/contract-check');
    await page.getByRole('button', { name: /Асуултад хариулах/ }).focus();
    await page.keyboard.press('Enter');
    // Focus lands on the question's heading.
    await expect(page.getByRole('heading', { name: 'Та хэзээ төрсөн бэ?' })).toBeFocused();
    for (let i = 0; i < 15; i += 1) {
      await page.keyboard.press('Tab');
      // Enter on any focused control submits the step's form; leaving answers
      // empty is allowed ("don't know").
      const tag = await page.evaluate(() => document.activeElement?.tagName);
      if (tag === 'BUTTON' || tag === 'INPUT') {
        await page.getByRole('button', { name: /Үргэлжлүүлэх|Шалгах/ }).focus();
        await page.keyboard.press('Enter');
      }
    }
    await expect(page.getByText('100-аас')).toBeVisible();
    await expect(page.getByText('Шар — тодруулах зүйл бий')).toBeVisible();
  });
});
