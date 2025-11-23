import { useState } from 'react';
import { Check, Zap, Loader2, Crown } from 'lucide-react';
import { PRICING_PLANS, createCheckoutSession, getStripe, formatCurrency } from '../../lib/stripe';
import { useAuth } from '../../contexts/AuthContext';

export function PricingPlans() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleSubscribe = async (planId: string) => {
    if (planId === 'free') return;

    setLoading(planId);
    setError('');

    try {
      const successUrl = `${window.location.origin}/dashboard?payment=success`;
      const cancelUrl = `${window.location.origin}/dashboard?payment=canceled`;

      const { sessionId, error: checkoutError } = await createCheckoutSession(
        planId,
        successUrl,
        cancelUrl
      );

      if (checkoutError) {
        throw new Error(checkoutError);
      }

      if (!sessionId) {
        throw new Error('No session ID returned');
      }

      const stripe = await getStripe();
      if (!stripe) {
        throw new Error('Stripe no disponible');
      }

      const redirectResult = await (stripe as any).redirectToCheckout({
        sessionId,
      });

      if (redirectResult?.error) {
        throw redirectResult.error;
      }
    } catch (err: any) {
      setError(err.message || 'Error al iniciar el proceso de pago');
    } finally {
      setLoading(null);
    }
  };

  const isCurrentPlan = (planId: string) => {
    return profile?.plan_type === planId;
  };

  return (
    <div className="py-12">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-slate-900 mb-4">
          Planes y Precios
        </h2>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          Elige el plan perfecto para tus necesidades. Cambia o cancela cuando quieras.
        </p>
      </div>

      {error && (
        <div className="max-w-4xl mx-auto mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {PRICING_PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`relative bg-white rounded-2xl border-2 p-8 transition-all ${
              plan.popular
                ? 'border-cyan-500 shadow-xl scale-105'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center space-x-1">
                <Crown className="w-4 h-4" />
                <span>Más Popular</span>
              </div>
            )}

            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">
                {plan.name}
              </h3>
              <div className="flex items-baseline justify-center space-x-2">
                <span className="text-5xl font-bold text-slate-900">
                  {formatCurrency(plan.price, plan.currency).replace(',00', '')}
                </span>
                {plan.price > 0 && (
                  <span className="text-slate-600">/mes</span>
                )}
              </div>
            </div>

            <ul className="space-y-4 mb-8">
              {plan.features.map((feature, idx) => (
                <li key={idx} className="flex items-start space-x-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSubscribe(plan.id)}
              disabled={loading === plan.id || isCurrentPlan(plan.id)}
              className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2 ${
                plan.popular
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white'
                  : isCurrentPlan(plan.id)
                  ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading === plan.id ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : isCurrentPlan(plan.id) ? (
                <span>Plan Actual</span>
              ) : plan.id === 'free' ? (
                <span>Plan Gratuito</span>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  <span>Suscribirse</span>
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center text-sm text-slate-600">
        <p>Todos los precios incluyen IVA. Puedes cancelar tu suscripción en cualquier momento.</p>
        <p className="mt-2">¿Necesitas un plan personalizado? <a href="mailto:sales@agenthub.com" className="text-cyan-600 hover:underline">Contáctanos</a></p>
      </div>
    </div>
  );
}
