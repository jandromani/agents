import { expect, test, type Page } from '@playwright/test';

const resolveBaseURL = (testInfo: import('@playwright/test').TestInfo) =>
  testInfo.project.use.baseURL ?? process.env.E2E_BASE_URL ?? process.env.SMOKE_BASE_URL;

const waitForSentryClient = async (page: Page) => {
  return page.waitForFunction(() => {
    return typeof window !== 'undefined' && typeof window.Sentry !== 'undefined';
  }, undefined, { timeout: 10000 }).catch(() => null);
};

test.describe('Observabilidad Sentry @smoke', () => {
  test('el frontend envía telemetría a Sentry', async ({ page }, testInfo) => {
    const baseURL = resolveBaseURL(testInfo);
    if (!baseURL) {
      test.skip('Base URL not provided. Set E2E_BASE_URL or SMOKE_BASE_URL to enable.');
    }

    await page.goto(`${baseURL}/`);
    const sentryReady = await waitForSentryClient(page);
    expect(sentryReady, 'El SDK de Sentry no se cargó en el navegador').toBeTruthy();

    const eventId = await page.evaluate(async () => {
      if (!window.Sentry) return null;
      const id = window.Sentry.captureMessage('smoke:frontend-observability', { level: 'info' });
      if (typeof window.Sentry.flush === 'function') {
        await window.Sentry.flush(2000);
      }
      return id;
    });

    expect(eventId, 'No se pudo enviar el evento de humo de Sentry en frontend').toBeTruthy();
  });

  test('las edge functions responden con evento de Sentry', async ({ request }) => {
    const edgeSmokeUrl = process.env.SMOKE_EDGE_SMOKE_URL;
    const edgeSmokeMethod = process.env.SMOKE_EDGE_SMOKE_METHOD || 'GET';
    const edgeAuthHeader = process.env.SMOKE_EDGE_AUTHORIZATION;
    if (!edgeSmokeUrl) {
      test.skip('Falta SMOKE_EDGE_SMOKE_URL para invocar la función Edge.');
    }

    const response = await request.fetch(edgeSmokeUrl!, {
      method: edgeSmokeMethod,
      headers: {
        'x-observability-smoke': 'true',
        ...(edgeAuthHeader ? { Authorization: edgeAuthHeader } : {}),
      },
    });

    expect(response.ok()).toBeTruthy();
    const headers = response.headers();
    expect(headers['x-sentry-smoke-id'], 'La función Edge no devolvió un ID de Sentry').toBeTruthy();
    expect(headers['x-sentry-monitor-slug'], 'La función Edge no reportó monitor Sentry').toBeTruthy();
  });
});
