import { expect, test } from '@playwright/test';

/**
 * Accounts. A real sign-up needs a Clerk development instance's keys
 * (NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY) and @clerk/testing;
 * without them that test is skipped, and what is checked instead is that the
 * site works with no accounts at all.
 */
const clerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);

test.describe('accounts', () => {
  test('with no Clerk keys, the account pages say so and every tool still works', async ({ page }) => {
    test.skip(clerk, 'Clerk is configured in this environment');
    await page.goto('/mn/account');
    await expect(page.getByText('Бүртгэл одоогоор нээгдээгүй байна.')).toBeVisible();
    await page.goto('/mn/sign-up');
    await expect(page.getByText('Бүртгэл одоогоор нээгдээгүй байна.')).toBeVisible();
    // No sign-in link in the header when there are no accounts to sign in to.
    await page.goto('/mn');
    await expect(page.locator('header a[href="/mn/account"]')).toHaveCount(0);
    await page.goto('/mn/contract-check');
    await expect(page.getByRole('button', { name: /Асуултад хариулах/ })).toBeVisible();
  });

  test('sign-up asks the age group first; under 13 gets no account; 13–17 needs a guardian', async ({ page }) => {
    test.skip(!clerk, 'Clerk keys not set: the sign-up flow needs a Clerk development instance');
    const { setupClerkTestingToken } = await import('@clerk/testing/playwright');
    await setupClerkTestingToken({ page });
    await page.goto('/mn/sign-up');
    await page.getByRole('radio', { name: '13 хүрээгүй' }).check();
    await expect(page.getByText(/13 хүрээгүй бол бүртгэл үүсгэхгүй/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Үргэлжлүүлэх' })).toBeDisabled();
    await page.getByRole('radio', { name: '15–17' }).check();
    await page.getByLabel('Би 13–17 настай.').check();
    await expect(page.getByRole('button', { name: 'Үргэлжлүүлэх' })).toBeDisabled();
    await page.getByLabel(/эцэг эх эсвэл асран хамгаалагч бөгөөд/).check();
    await page.getByRole('button', { name: 'Үргэлжлүүлэх' }).click();
    await page.getByLabel(/И-мэйл|Email/).fill(`jishee+clerk_test_${Date.now()}@example.org`);
  });

  test('the privacy notice is published in both languages, with its draft banner', async ({ page }) => {
    await page.goto('/mn/privacy');
    await expect(page.getByRole('heading', { level: 1, name: 'Нууцлалын бодлого' })).toBeVisible();
    await expect(page.getByText(/хуульчаар хараахан хянагдаагүй ноорог/)).toBeVisible();
    await page.goto('/en/privacy');
    await expect(page.getByRole('heading', { level: 1, name: 'Privacy notice' })).toBeVisible();
  });
});
