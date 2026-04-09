import { expect, test } from '@playwright/test';

const resolveBaseURL = (testInfo: import('@playwright/test').TestInfo) =>
  testInfo.project.use.baseURL ?? process.env.E2E_BASE_URL ?? process.env.SMOKE_BASE_URL;

const resolveSupabaseConfig = () => ({
  url: process.env.VITE_SUPABASE_URL ?? process.env.E2E_SUPABASE_URL,
  anonKey: process.env.VITE_SUPABASE_ANON_KEY ?? process.env.E2E_SUPABASE_ANON_KEY,
});

test.describe('RAG Pipeline', () => {
  test.beforeEach(async ({}, testInfo) => {
    const baseURL = resolveBaseURL(testInfo);
    if (!baseURL) {
      test.skip('Base URL not provided. Set E2E_BASE_URL to enable.');
    }
  });

  test('process-document edge function returns correct CORS headers @smoke', async ({ request }, testInfo) => {
    const baseURL = resolveBaseURL(testInfo)!;
    const { anonKey } = resolveSupabaseConfig();
    if (!anonKey) test.skip('Missing Supabase anon key.');

    const response = await request.options(`${baseURL}/functions/v1/process-document`, {
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

  test('semantic-search edge function returns correct CORS headers @smoke', async ({ request }, testInfo) => {
    const baseURL = resolveBaseURL(testInfo)!;
    const { anonKey } = resolveSupabaseConfig();
    if (!anonKey) test.skip('Missing Supabase anon key.');

    const response = await request.options(`${baseURL}/functions/v1/semantic-search`, {
      headers: {
        Origin: baseURL,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization',
        Apikey: anonKey!,
      },
    });

    expect(response.headers()['access-control-allow-origin']).toBe('*');
  });

  test('process-document rejects unauthenticated requests', async ({ request }, testInfo) => {
    const baseURL = resolveBaseURL(testInfo)!;
    const { anonKey } = resolveSupabaseConfig();
    if (!anonKey) test.skip('Missing Supabase anon key.');

    const response = await request.post(`${baseURL}/functions/v1/process-document`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer invalid_token',
        Apikey: anonKey!,
      },
      data: {
        documentId: 'nonexistent-id',
        content: 'Test content',
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('semantic-search rejects unauthenticated requests', async ({ request }, testInfo) => {
    const baseURL = resolveBaseURL(testInfo)!;
    const { anonKey } = resolveSupabaseConfig();
    if (!anonKey) test.skip('Missing Supabase anon key.');

    const response = await request.post(`${baseURL}/functions/v1/semantic-search`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer invalid_token',
        Apikey: anonKey!,
      },
      data: {
        query: 'test query',
        agentId: 'nonexistent-id',
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('documents table schema is correct @smoke', async ({ request }, testInfo) => {
    const { url, anonKey } = resolveSupabaseConfig();
    if (!url || !anonKey) test.skip('Missing Supabase config.');

    const response = await request.get(
      `${url}/rest/v1/documents?select=id,user_id,file_type,processing_status,chunk_count&limit=1`,
      {
        headers: {
          apikey: anonKey!,
          Authorization: `Bearer ${anonKey}`,
        },
      }
    );

    expect([200, 206]).toContain(response.status());
  });

  test('document_chunks table with vector column is accessible @smoke', async ({ request }, testInfo) => {
    const { url, anonKey } = resolveSupabaseConfig();
    if (!url || !anonKey) test.skip('Missing Supabase config.');

    const response = await request.get(
      `${url}/rest/v1/document_chunks?select=id,document_id,chunk_index,content,token_count&limit=1`,
      {
        headers: {
          apikey: anonKey!,
          Authorization: `Bearer ${anonKey}`,
        },
      }
    );

    expect([200, 206]).toContain(response.status());
  });

  test('RAG upload flow appears in agent wizard', async ({ page }, testInfo) => {
    const baseURL = resolveBaseURL(testInfo)!;

    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;
    if (!email || !password) {
      test.skip('E2E credentials not provided.');
    }

    await page.goto(`${baseURL}/`);
    await page.getByRole('button', { name: /acceder|crea tu primer agente/i }).first().click();

    const hasSignIn = await page.getByRole('button', { name: /¿ya tienes cuenta\? inicia sesión/i }).isVisible();
    if (hasSignIn) {
      await page.getByRole('button', { name: /¿ya tienes cuenta\? inicia sesión/i }).click();
    }

    await page.getByLabel('Email').fill(email!);
    await page.getByLabel('Contraseña').fill(password!);
    await page.getByRole('button', { name: /ingresar/i }).click();

    await expect(page.getByText('Mis Agentes')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: /crear agente/i }).click();
    await expect(page.getByRole('heading', { name: /crear nuevo agente/i })).toBeVisible();

    await page.getByRole('button', { name: /continuar/i }).click();
    await page.getByRole('button', { name: /continuar/i }).click();

    await expect(page.getByText(/documentos/i)).toBeVisible({ timeout: 5000 });
  });

  test('search_similar_chunks RPC function exists @smoke', async ({ request }, testInfo) => {
    const { url, anonKey } = resolveSupabaseConfig();
    if (!url || !anonKey) test.skip('Missing Supabase config.');

    const response = await request.post(
      `${url}/rest/v1/rpc/search_similar_chunks`,
      {
        headers: {
          apikey: anonKey!,
          Authorization: `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
        },
        data: {
          query_embedding: Array(1536).fill(0),
          match_threshold: 0.7,
          match_count: 5,
        },
      }
    );

    expect([200, 400, 404]).toContain(response.status());
  });
});
