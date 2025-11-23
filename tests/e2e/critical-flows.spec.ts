import { expect, test } from '@playwright/test';

const resolveBaseURL = (testInfo: import('@playwright/test').TestInfo) =>
  testInfo.project.use.baseURL ?? process.env.E2E_BASE_URL ?? process.env.SMOKE_BASE_URL;

test.describe('Critical user journeys', () => {
  test.beforeEach(async ({}, testInfo) => {
    const baseURL = resolveBaseURL(testInfo);
    if (!baseURL) {
      test.skip('Base URL not provided. Set E2E_BASE_URL or SMOKE_BASE_URL to enable.');
    }
  });

  test('onboarding flow @smoke', async ({ page }, testInfo) => {
    const baseURL = resolveBaseURL(testInfo)!;
    const response = await page.goto(`${baseURL}/onboarding`);

    await expect(response?.ok()).toBeTruthy();
    await page.waitForLoadState('networkidle');
  });

  test('payment collection flow @smoke', async ({ page }, testInfo) => {
    const baseURL = resolveBaseURL(testInfo)!;
    const response = await page.goto(`${baseURL}/payments`);

    await expect(response?.ok()).toBeTruthy();
    await page.waitForLoadState('networkidle');
  });

  test('agent deployment flow @smoke', async ({ page }, testInfo) => {
    const baseURL = resolveBaseURL(testInfo)!;
    const response = await page.goto(`${baseURL}/agents/deploy`);

    await expect(response?.ok()).toBeTruthy();
    await page.waitForLoadState('networkidle');
  });
});
