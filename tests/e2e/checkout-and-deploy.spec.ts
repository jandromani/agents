import { test, expect } from '@playwright/test';
import { checkoutFixtures, stripeSandbox, supabaseFixtures } from './fixtures';

const hasSandboxCreds = Boolean(stripeSandbox.secretKey && supabaseFixtures.url);

test.describe('Checkout sandbox flow', () => {
  test.skip(!hasSandboxCreds, 'Stripe/Supabase sandbox credentials are required');

  test('initiates checkout session with configured baseURL', async ({ page, request }) => {
    const response = await request.get('/');
    expect(response.ok()).toBeTruthy();

    await page.goto(checkoutFixtures.cancelPath);
    await expect(page).toHaveURL(new RegExp(checkoutFixtures.cancelPath));
  });
});

test.describe('Deployment dashboard smoke', () => {
  test.skip(!supabaseFixtures.url, 'Supabase sandbox URL required for deploy checks');

  test('loads dashboard shell and wizard entrypoint', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByText(/Crear Nuevo Agente|Agentes/i)).toBeVisible();
  });
});
