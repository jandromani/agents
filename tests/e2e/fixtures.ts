export const supabaseFixtures = {
  url: process.env.E2E_SUPABASE_URL,
  anonKey: process.env.E2E_SUPABASE_ANON_KEY,
  serviceRole: process.env.E2E_SUPABASE_SERVICE_ROLE,
  testEmail: process.env.E2E_TEST_EMAIL || 'checkout-test@example.com',
  testPassword: process.env.E2E_TEST_PASSWORD || 'Password123!',
};

export const stripeSandbox = {
  secretKey: process.env.STRIPE_SANDBOX_KEY,
  publishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY,
};

export const checkoutFixtures = {
  planId: 'premium_basic',
  successPath: '/billing/success',
  cancelPath: '/billing',
};
