import { describe, it, expect } from 'vitest';
import {
  handleCustomerCreated,
  handlePaymentSucceeded,
  handleSubscriptionUpdate,
} from '../../supabase/functions/stripe-webhook/handlers.shared';

const createTableMock = () => ({
  data: null as any,
  select: function () { return this; },
  eq: function () { return this; },
  single: function () { return Promise.resolve({ data: this.data }); },
  upsert: function (payload: any) { this.lastUpsert = payload; return Promise.resolve({}); },
  insert: function (payload: any) { this.lastInsert = payload; return Promise.resolve({}); },
  update: function (payload?: any) { this.lastUpdatePayload = payload; return this; },
});

describe('stripe webhook handlers', () => {
  it('links customer to profile when email exists', async () => {
    const profiles = createTableMock();
    profiles.data = { id: 'user-1' };
    const stripeCustomers = createTableMock();
    const supabase = {
      from: (table: string) => ({
        profiles,
        stripe_customers: stripeCustomers,
      }[table]),
    } as any;

    await handleCustomerCreated(supabase, { id: 'cus_123', email: 'a@example.com' });
    expect((stripeCustomers as any).lastUpsert).toEqual({
      user_id: 'user-1',
      stripe_customer_id: 'cus_123',
      email: 'a@example.com',
    });
  });

  it('credits user after successful payment', async () => {
    const stripeCustomers = createTableMock();
    stripeCustomers.data = { user_id: 'user-1' };
    const creditTransactions = createTableMock();
    const notifications = createTableMock();
    const payments = createTableMock();
    const supabase = {
      rpc: () => Promise.resolve({}),
      from: (table: string) => ({
        stripe_customers: stripeCustomers,
        credit_transactions: creditTransactions,
        notifications,
        payment_intents: payments,
      }[table]),
    } as any;

    await handlePaymentSucceeded(supabase, {} as any, {
      id: 'pi_123',
      amount: 5000,
      currency: 'eur',
      customer: 'cus_123',
      metadata: {},
    });

    expect((creditTransactions as any).lastInsert.amount).toBeCloseTo(45);
    expect((notifications as any).lastInsert?.metadata?.payment_intent_id).toBe('pi_123');
  });

  it('updates plan based on subscription price id', async () => {
    const stripeCustomers = createTableMock();
    stripeCustomers.data = { user_id: 'user-1' };
    const subscriptions = createTableMock();
    const profiles = createTableMock();
    const supabase = {
      from: (table: string) => ({
        stripe_customers: stripeCustomers,
        subscriptions,
        profiles,
      }[table]),
    } as any;

    await handleSubscriptionUpdate(supabase, {
      customer: 'cus_123',
      id: 'sub_123',
      status: 'active',
      current_period_start: 1,
      current_period_end: 2,
      cancel_at_period_end: false,
      items: { data: [{ price: { id: 'price_premium_basic' } }] },
    });

    expect((subscriptions as any).lastUpsert?.stripe_price_id).toBe('price_premium_basic');
    expect((profiles as any).lastUpdatePayload?.plan_type || profiles.plan_type).toBeDefined();
  });
});
