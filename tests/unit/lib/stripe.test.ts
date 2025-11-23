import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchMock = vi.fn();

vi.stubGlobal('fetch', fetchMock as any);
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(async () => ({ id: 'stripe-instance' })),
}));

describe('stripe client helpers', () => {
  beforeEach(() => {
    vi.resetModules();
    fetchMock.mockReset();
    (globalThis as any).importMeta = { env: {} };
  });

  const mockSupabase = {
    auth: {
      getSession: vi.fn(),
    },
    from: vi.fn(),
  };

  vi.mock('../../../src/lib/supabase', () => ({
    supabase: mockSupabase,
  }));

  it('formats money and dates consistently', async () => {
    (globalThis as any).importMeta = { env: { VITE_STRIPE_PUBLISHABLE_KEY: 'pk_test' } };
    const stripeLib = await import('../../../src/lib/stripe');
    expect(stripeLib.formatCurrency(10, 'eur')).toContain('€');
    const formattedDate = stripeLib.formatDate('2023-01-01T00:00:00.000Z');
    expect(formattedDate).toContain('2023');
  });

  it('returns error when user not authenticated for checkout', async () => {
    (globalThis as any).importMeta = {
      env: {
        VITE_SUPABASE_URL: 'https://example.supabase.co',
        VITE_STRIPE_PUBLISHABLE_KEY: 'pk_test',
      },
    };
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    const stripeLib = await import('../../../src/lib/stripe');
    const response = await stripeLib.createCheckoutSession('plan_basic', 'ok', 'cancel');
    expect(response.error).toBe('Not authenticated');
  });

  it('creates credit purchase payload when user is authenticated', async () => {
    (globalThis as any).importMeta = {
      env: {
        VITE_SUPABASE_URL: 'https://example.supabase.co',
        VITE_STRIPE_PUBLISHABLE_KEY: 'pk_test',
      },
    };
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token', user: { id: 'user-123' } } },
    });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ clientSecret: 'secret' }),
    } as any);

    const stripeLib = await import('../../../src/lib/stripe');
    const result = await stripeLib.createCreditPurchaseIntent('credits_10');
    expect(fetchMock).toHaveBeenCalled();
    expect(result.clientSecret).toBe('secret');
  });
});
