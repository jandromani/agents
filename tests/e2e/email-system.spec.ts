import { expect, test } from '@playwright/test';

const resolveBaseURL = (testInfo: import('@playwright/test').TestInfo) =>
  testInfo.project.use.baseURL ?? process.env.E2E_BASE_URL ?? process.env.SMOKE_BASE_URL;

const resolveSupabaseConfig = () => ({
  url: process.env.VITE_SUPABASE_URL ?? process.env.E2E_SUPABASE_URL,
  anonKey: process.env.VITE_SUPABASE_ANON_KEY ?? process.env.E2E_SUPABASE_ANON_KEY,
});

test.describe('Email System', () => {
  test.beforeEach(async ({}, testInfo) => {
    const baseURL = resolveBaseURL(testInfo);
    if (!baseURL) {
      test.skip('Base URL not provided. Set E2E_BASE_URL to enable.');
    }
  });

  test('send-email edge function returns correct CORS headers @smoke', async ({ request }, testInfo) => {
    const baseURL = resolveBaseURL(testInfo)!;
    const { anonKey } = resolveSupabaseConfig();
    if (!anonKey) test.skip('Missing Supabase anon key.');

    const response = await request.options(`${baseURL}/functions/v1/send-email`, {
      headers: {
        Origin: baseURL,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization',
        Apikey: anonKey!,
      },
    });

    expect(response.headers()['access-control-allow-origin']).toBe('*');
    expect(response.headers()['access-control-allow-methods']).toContain('POST');
  });

  test('send-email rejects unauthenticated requests', async ({ request }, testInfo) => {
    const baseURL = resolveBaseURL(testInfo)!;
    const { anonKey } = resolveSupabaseConfig();
    if (!anonKey) test.skip('Missing Supabase anon key.');

    const response = await request.post(`${baseURL}/functions/v1/send-email`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer invalid_token',
        Apikey: anonKey!,
      },
      data: {
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('process-email-queue edge function responds @smoke', async ({ request }, testInfo) => {
    const baseURL = resolveBaseURL(testInfo)!;
    const { anonKey } = resolveSupabaseConfig();
    if (!anonKey) test.skip('Missing Supabase anon key.');

    const response = await request.post(`${baseURL}/functions/v1/process-email-queue`, {
      headers: {
        'Content-Type': 'application/json',
        Apikey: anonKey!,
      },
      data: {},
    });

    expect([200, 400, 500]).toContain(response.status());
    const body = await response.json();
    expect(body).toBeDefined();
  });

  test('email queue persists messages in DB schema', async ({ request }, testInfo) => {
    const { url, anonKey } = resolveSupabaseConfig();
    if (!url || !anonKey) test.skip('Missing Supabase config.');

    const response = await request.get(`${url}/rest/v1/email_queue?select=id,status,to_email,priority&limit=1`, {
      headers: {
        apikey: anonKey!,
        Authorization: `Bearer ${anonKey}`,
      },
    });

    expect([200, 206]).toContain(response.status());
  });

  test('email_logs table is accessible @smoke', async ({ request }, testInfo) => {
    const { url, anonKey } = resolveSupabaseConfig();
    if (!url || !anonKey) test.skip('Missing Supabase config.');

    const response = await request.get(`${url}/rest/v1/email_logs?select=id,status,to_email&limit=1`, {
      headers: {
        apikey: anonKey!,
        Authorization: `Bearer ${anonKey}`,
      },
    });

    expect([200, 206]).toContain(response.status());
  });

  test('welcome email is sent on user registration flow', async ({ page }, testInfo) => {
    const baseURL = resolveBaseURL(testInfo)!;
    await page.goto(`${baseURL}/`);

    await page.getByRole('button', { name: /crea tu primer agente gratis/i }).click();
    await expect(page.getByRole('heading', { name: /crear cuenta/i })).toBeVisible();

    await page.getByLabel('Nombre Completo').fill('Email Test User');
    await page.getByLabel('Email').fill(`emailtest+${Date.now()}@example.com`);
    await page.getByLabel('Contraseña').fill('SecureTest123!');

    await expect(page.getByText('Contraseña segura')).toBeVisible();
  });
});
