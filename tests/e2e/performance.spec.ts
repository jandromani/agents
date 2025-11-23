import { expect, test } from '@playwright/test';

type Info = import('@playwright/test').TestInfo;
const resolveBaseURL = (testInfo: Info) =>
  testInfo.project.use.baseURL ?? process.env.E2E_BASE_URL ?? process.env.SMOKE_BASE_URL;

const TARGET_PATHS = ['/', '/onboarding', '/payments', '/agents/deploy'];

const measure = async <T>(fn: () => Promise<T>) => {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  return { result, duration };
};

test.describe('Performance and resiliency', () => {
  test.beforeEach(async ({}, testInfo) => {
    const baseURL = resolveBaseURL(testInfo);
    if (!baseURL) {
      test.skip('Base URL not provided. Set E2E_BASE_URL or SMOKE_BASE_URL to enable.');
    }
  });

  test('aguanta ráfagas concurrentes', async ({ request }, testInfo) => {
    const baseURL = resolveBaseURL(testInfo)!;

    const { duration, result: responses } = await measure(async () =>
      Promise.all(
        Array.from({ length: 10 }).map((_, idx) =>
          request.get(`${baseURL}${TARGET_PATHS[idx % TARGET_PATHS.length]}`)
        )
      )
    );

    responses.forEach(response => expect(response.ok()).toBeTruthy());
    expect(duration).toBeLessThan(5000);
  });

  test('latencia estable en rutas críticas', async ({ request }, testInfo) => {
    const baseURL = resolveBaseURL(testInfo)!;

    for (const path of TARGET_PATHS) {
      const { duration, result: response } = await measure(() => request.get(`${baseURL}${path}`));
      expect(response.ok()).toBeTruthy();
      expect(duration).toBeLessThan(1500);
    }
  });
});
