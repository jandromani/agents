import { loadStripe, Stripe } from '@stripe/stripe-js';
import { supabase } from './supabase';

let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      console.warn('Stripe publishable key not configured');
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
};

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  stripePriceId?: string;
  features: string[];
  popular?: boolean;
  agentLimit: number;
  queriesPerDay: number;
  models: string[];
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'eur',
    interval: 'month',
    features: [
      '1 agente activo',
      '5 consultas por día',
      'Modelos básicos',
      'Soporte por email',
    ],
    agentLimit: 1,
    queriesPerDay: 5,
    models: ['gpt-3.5-turbo'],
  },
  {
    id: 'premium_basic',
    name: 'Premium Basic',
    price: 29,
    currency: 'eur',
    interval: 'month',
    stripePriceId: 'price_premium_basic_monthly',
    popular: true,
    features: [
      '3 agentes activos',
      '100 consultas por día',
      'Modelos avanzados',
      'Documentos RAG ilimitados',
      'Soporte prioritario',
      'Estadísticas detalladas',
    ],
    agentLimit: 3,
    queriesPerDay: 100,
    models: ['gpt-3.5-turbo', 'gpt-4', 'claude-2'],
  },
  {
    id: 'premium_ultra',
    name: 'Premium Ultra',
    price: 99,
    currency: 'eur',
    interval: 'month',
    stripePriceId: 'price_premium_ultra_monthly',
    features: [
      '10 agentes activos',
      'Consultas ilimitadas',
      'Todos los modelos AI',
      'RAG avanzado con embeddings',
      'Soporte dedicado 24/7',
      'API personalizada',
      'White label (próximamente)',
    ],
    agentLimit: 10,
    queriesPerDay: -1,
    models: ['all'],
  },
];

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  currency: string;
  bonus?: number;
  popular?: boolean;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'credits_10',
    name: 'Starter',
    credits: 10,
    price: 10,
    currency: 'eur',
  },
  {
    id: 'credits_50',
    name: 'Professional',
    credits: 50,
    price: 45,
    currency: 'eur',
    bonus: 5,
    popular: true,
  },
  {
    id: 'credits_100',
    name: 'Business',
    credits: 100,
    price: 80,
    currency: 'eur',
    bonus: 20,
  },
  {
    id: 'credits_500',
    name: 'Enterprise',
    credits: 500,
    price: 350,
    currency: 'eur',
    bonus: 150,
  },
];

export async function createCheckoutSession(
  planId: string,
  successUrl: string,
  cancelUrl: string
): Promise<{ sessionId?: string; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { error: 'Not authenticated' };
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          planId,
          successUrl,
          cancelUrl,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || 'Failed to create checkout session' };
    }

    return { sessionId: data.sessionId };
  } catch (error: any) {
    return { error: error.message || 'Network error' };
  }
}

export async function createCreditPurchaseIntent(
  packageId: string
): Promise<{ clientSecret?: string; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { error: 'Not authenticated' };
    }

    const pkg = CREDIT_PACKAGES.find(p => p.id === packageId);
    if (!pkg) {
      return { error: 'Invalid package' };
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-intent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          amount: pkg.price,
          currency: pkg.currency,
          description: `Recarga de ${pkg.credits}€ créditos`,
          metadata: {
            package_id: packageId,
            credits: pkg.credits,
            bonus: pkg.bonus || 0,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || 'Failed to create payment intent' };
    }

    return { clientSecret: data.clientSecret };
  } catch (error: any) {
    return { error: error.message || 'Network error' };
  }
}

export async function getPaymentMethods(): Promise<{
  methods?: any[];
  error?: string;
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return { error: error.message };
    }

    return { methods: data };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getInvoices(): Promise<{
  invoices?: any[];
  error?: string;
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return { error: error.message };
    }

    return { invoices: data };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function cancelSubscription(): Promise<{
  success?: boolean;
  error?: string;
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { error: 'Not authenticated' };
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cancel-subscription`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || 'Failed to cancel subscription' };
    }

    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export function formatCurrency(amount: number, currency: string = 'eur'): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
