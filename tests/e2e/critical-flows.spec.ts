import { expect, test, type Page } from '@playwright/test';

const resolveBaseURL = (testInfo: import('@playwright/test').TestInfo) =>
  testInfo.project.use.baseURL ?? process.env.E2E_BASE_URL ?? process.env.SMOKE_BASE_URL;

const resolveCredentials = () => ({
  email: process.env.E2E_USER_EMAIL,
  password: process.env.E2E_USER_PASSWORD,
});

async function signInIfPossible(page: Page, baseURL: string) {
  const { email, password } = resolveCredentials();
  if (!email || !password) {
    test.skip('Missing E2E_USER_EMAIL or E2E_USER_PASSWORD.');
  }

  await page.goto(`${baseURL}/`);
  await page.getByRole('button', { name: /acceder|crea tu primer agente/i }).first().click();
  await page.getByRole('button', { name: /¿ya tienes cuenta\? inicia sesión/i }).click();
  await page.getByLabel('Email').fill(email!);
  await page.getByLabel('Contraseña').fill(password!);
  await page.getByRole('button', { name: /ingresar/i }).click();
  await expect(page.getByText('Mis Agentes')).toBeVisible({ timeout: 15000 });
}

test.describe('Critical user journeys', () => {
  test.beforeEach(async ({}, testInfo) => {
    const baseURL = resolveBaseURL(testInfo);
    if (!baseURL) {
      test.skip('Base URL not provided. Set E2E_BASE_URL or SMOKE_BASE_URL to enable.');
    }
  });

  test('registro y restablecimiento de acceso', async ({ page }, testInfo) => {
    const baseURL = resolveBaseURL(testInfo)!;
    await page.goto(`${baseURL}/`);
    await page.getByRole('button', { name: /crea tu primer agente gratis/i }).click();

    await expect(page.getByRole('heading', { name: /crear cuenta/i })).toBeVisible();
    await page.getByLabel('Nombre Completo').fill('E2E Test User');
    await page.getByLabel('Email').fill('demo@example.com');
    await page.getByLabel('Contraseña').fill('Segura123456!');
    await expect(page.getByText('Contraseña segura')).toBeVisible();

    await page.getByRole('button', { name: /¿ya tienes cuenta\? inicia sesión/i }).click();
    await expect(page.getByText('Ingresa a tu cuenta')).toBeVisible();

    await page.getByRole('button', { name: /¿olvidaste tu contraseña\?/i }).click();
    await expect(page.getByText('Recuperar acceso')).toBeVisible();
  });

  test('creación de agentes y RAG desde el wizard', async ({ page }, testInfo) => {
    const baseURL = resolveBaseURL(testInfo)!;
    await signInIfPossible(page, baseURL);

    await page.getByRole('button', { name: /crear agente/i }).click();
    await expect(page.getByRole('heading', { name: /crear nuevo agente/i })).toBeVisible();

    await page.getByLabel('Nombre del Agente *').fill('Agente Demo E2E');
    await page.getByLabel('Industria').fill('Servicios');
    await page.getByLabel('Idioma principal').fill('Español');

    await page.getByRole('button', { name: /continuar/i }).click();
    await page.getByRole('button', { name: /continuar/i }).click();

    await expect(page.getByText('Documentos (Opcional)')).toBeVisible();
    await page.getByLabel('Seleccionar Archivos').click();
  });

  test('facturación y notificaciones en el panel', async ({ page }, testInfo) => {
    const baseURL = resolveBaseURL(testInfo)!;
    await signInIfPossible(page, baseURL);

    await expect(page.getByText('Preferencias de notificación')).toBeVisible();
    await page.getByText('Actividad de Agentes').click();
    await page.getByRole('button', { name: /push/i }).click();

    await page.goto(`${baseURL}/admin/billing`);
    await expect(page.getByText('Facturación')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Planes y Precios')).toBeVisible();
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
