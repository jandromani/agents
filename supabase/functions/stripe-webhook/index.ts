import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import Stripe from 'npm:stripe@14.10.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!stripeSecretKey || !stripeWebhookSecret) {
      throw new Error('Stripe credentials not configured');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      throw new Error('Missing stripe signature');
    }

    const body = await req.text();
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      stripeWebhookSecret
    );

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Webhook event:', event.type);

    switch (event.type) {
      case 'customer.created': {
        const customer = event.data.object as Stripe.Customer;
        await handleCustomerCreated(supabase, customer);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSucceeded(supabase, stripe, paymentIntent);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(supabase, paymentIntent);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(supabase, invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(supabase, invoice);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(supabase, subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabase, subscription);
        break;
      }

      case 'payment_method.attached': {
        const paymentMethod = event.data.object as Stripe.PaymentMethod;
        await handlePaymentMethodAttached(supabase, paymentMethod);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

async function handleCustomerCreated(
  supabase: any,
  customer: Stripe.Customer
) {
  const email = customer.email;
  if (!email) return;

  const { data: user } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();

  if (user) {
    await supabase.from('stripe_customers').upsert({
      user_id: user.id,
      stripe_customer_id: customer.id,
      email: email,
    });
  }
}

async function handlePaymentSucceeded(
  supabase: any,
  stripe: Stripe,
  paymentIntent: Stripe.PaymentIntent
) {
  await supabase.from('payment_intents').upsert({
    stripe_payment_intent_id: paymentIntent.id,
    amount: paymentIntent.amount / 100,
    currency: paymentIntent.currency,
    status: 'succeeded',
    description: paymentIntent.description || null,
    metadata: paymentIntent.metadata || {},
  });

  const customerId = paymentIntent.customer as string;
  const { data: stripeCustomer } = await supabase
    .from('stripe_customers')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (stripeCustomer) {
    const amount = paymentIntent.amount / 100;
    const platformFee = amount * 0.1;
    const userCredits = amount - platformFee;

    await supabase.from('credit_transactions').insert({
      user_id: stripeCustomer.user_id,
      type: 'purchase',
      amount: userCredits,
      description: `Recarga de créditos - ${paymentIntent.id}`,
      metadata: {
        payment_intent_id: paymentIntent.id,
        platform_fee: platformFee,
      },
    });

    await supabase.rpc('update_user_credits', {
      p_user_id: stripeCustomer.user_id,
      p_amount: userCredits,
    });

    await supabase.from('notifications').insert({
      user_id: stripeCustomer.user_id,
      type: 'payment_success',
      title: 'Pago Procesado',
      message: `Se han añadido ${userCredits.toFixed(2)}€ de créditos a tu cuenta.`,
      metadata: {
        amount: userCredits,
        payment_intent_id: paymentIntent.id,
      },
    });
  }
}

async function handlePaymentFailed(
  supabase: any,
  paymentIntent: Stripe.PaymentIntent
) {
  await supabase.from('payment_intents').upsert({
    stripe_payment_intent_id: paymentIntent.id,
    amount: paymentIntent.amount / 100,
    currency: paymentIntent.currency,
    status: 'canceled',
    description: paymentIntent.description || null,
    metadata: paymentIntent.metadata || {},
  });

  const customerId = paymentIntent.customer as string;
  const { data: stripeCustomer } = await supabase
    .from('stripe_customers')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (stripeCustomer) {
    await supabase.from('notifications').insert({
      user_id: stripeCustomer.user_id,
      type: 'payment_failed',
      title: 'Pago Fallido',
      message: 'Tu pago no pudo ser procesado. Por favor, verifica tu método de pago.',
      metadata: {
        payment_intent_id: paymentIntent.id,
      },
    });
  }
}

async function handleInvoicePaid(
  supabase: any,
  invoice: Stripe.Invoice
) {
  const customerId = invoice.customer as string;
  const { data: stripeCustomer } = await supabase
    .from('stripe_customers')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (stripeCustomer) {
    const total = invoice.total / 100;
    const subtotal = invoice.subtotal / 100;
    const tax = invoice.tax || 0;

    await supabase.from('invoices').upsert({
      user_id: stripeCustomer.user_id,
      stripe_invoice_id: invoice.id,
      amount_total: total,
      amount_subtotal: subtotal,
      amount_tax: tax / 100,
      currency: invoice.currency,
      status: 'paid',
      description: invoice.description || null,
      pdf_url: invoice.invoice_pdf,
      hosted_invoice_url: invoice.hosted_invoice_url,
      period_start: new Date(invoice.period_start * 1000).toISOString(),
      period_end: new Date(invoice.period_end * 1000).toISOString(),
      paid_at: new Date().toISOString(),
    });
  }
}

async function handleInvoicePaymentFailed(
  supabase: any,
  invoice: Stripe.Invoice
) {
  const customerId = invoice.customer as string;
  const { data: stripeCustomer } = await supabase
    .from('stripe_customers')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (stripeCustomer) {
    await supabase.from('notifications').insert({
      user_id: stripeCustomer.user_id,
      type: 'payment_failed',
      title: 'Factura Impagada',
      message: `El pago de tu factura ${invoice.number} ha fallado. Por favor, actualiza tu método de pago.`,
      metadata: {
        invoice_id: invoice.id,
        amount: invoice.total / 100,
      },
    });
  }
}

async function handleSubscriptionUpdate(
  supabase: any,
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;
  const { data: stripeCustomer } = await supabase
    .from('stripe_customers')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (stripeCustomer) {
    const priceId = subscription.items.data[0]?.price.id;
    
    await supabase.from('subscriptions').upsert({
      user_id: stripeCustomer.user_id,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
    });

    let planType = 'free';
    if (priceId) {
      if (priceId.includes('basic')) planType = 'premium_basic';
      else if (priceId.includes('ultra')) planType = 'premium_ultra';
    }

    await supabase.from('profiles').update({
      plan_type: planType,
    }).eq('id', stripeCustomer.user_id);
  }
}

async function handleSubscriptionDeleted(
  supabase: any,
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;
  const { data: stripeCustomer } = await supabase
    .from('stripe_customers')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (stripeCustomer) {
    await supabase.from('subscriptions').update({
      status: 'canceled',
    }).eq('stripe_subscription_id', subscription.id);

    await supabase.from('profiles').update({
      plan_type: 'free',
    }).eq('id', stripeCustomer.user_id);

    await supabase.from('notifications').insert({
      user_id: stripeCustomer.user_id,
      type: 'subscription_canceled',
      title: 'Suscripción Cancelada',
      message: 'Tu suscripción ha sido cancelada. Has vuelto al plan gratuito.',
    });
  }
}

async function handlePaymentMethodAttached(
  supabase: any,
  paymentMethod: Stripe.PaymentMethod
) {
  const customerId = paymentMethod.customer as string;
  if (!customerId) return;

  const { data: stripeCustomer } = await supabase
    .from('stripe_customers')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (stripeCustomer && paymentMethod.card) {
    await supabase.from('payment_methods').upsert({
      user_id: stripeCustomer.user_id,
      stripe_payment_method_id: paymentMethod.id,
      type: 'card',
      card_brand: paymentMethod.card.brand,
      card_last4: paymentMethod.card.last4,
      card_exp_month: paymentMethod.card.exp_month,
      card_exp_year: paymentMethod.card.exp_year,
    });
  }
}
