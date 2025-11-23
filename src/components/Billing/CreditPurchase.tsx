import { useState } from 'react';
import { X, CreditCard, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CREDIT_PACKAGES, createCreditPurchaseIntent, getStripe, formatCurrency } from '../../lib/stripe';

interface CreditPurchaseProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

function PaymentForm({
  amount,
  onSuccess,
  onError
}: {
  amount: number;
  onSuccess: () => void;
  onError: (error: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard?payment=success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        onError(error.message || 'Error al procesar el pago');
      } else {
        onSuccess();
      }
    } catch (err: any) {
      onError(err.message || 'Error al procesar el pago');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
      >
        {processing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Procesando...</span>
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5" />
            <span>Pagar {formatCurrency(amount)}</span>
          </>
        )}
      </button>
    </form>
  );
}

export function CreditPurchase({ isOpen, onClose, onSuccess }: CreditPurchaseProps) {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handlePackageSelect = async (packageId: string) => {
    setSelectedPackage(packageId);
    setLoading(true);
    setError('');

    try {
      const { clientSecret: secret, error: intentError } = await createCreditPurchaseIntent(packageId);

      if (intentError) {
        throw new Error(intentError);
      }

      if (!secret) {
        throw new Error('No se pudo crear la intención de pago');
      }

      setClientSecret(secret);
    } catch (err: any) {
      setError(err.message || 'Error al preparar el pago');
      setSelectedPackage(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    setSuccess(true);
    setTimeout(() => {
      onSuccess?.();
      onClose();
    }, 2000);
  };

  const handleError = (errorMsg: string) => {
    setError(errorMsg);
  };

  const selectedPkg = CREDIT_PACKAGES.find(p => p.id === selectedPackage);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-gradient-to-r from-cyan-500 to-blue-500 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Recargar Créditos</h2>
            <p className="text-cyan-100 text-sm mt-1">
              Selecciona un paquete para continuar
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="p-6">
          {success ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-slate-900 mb-2">
                ¡Pago Exitoso!
              </h3>
              <p className="text-slate-600">
                Tus créditos se han añadido a tu cuenta.
              </p>
            </div>
          ) : !selectedPackage ? (
            <div className="grid md:grid-cols-2 gap-6">
              {CREDIT_PACKAGES.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`relative border-2 rounded-xl p-6 cursor-pointer transition-all ${
                    pkg.popular
                      ? 'border-cyan-500 bg-cyan-50'
                      : 'border-slate-200 hover:border-cyan-300'
                  }`}
                  onClick={() => handlePackageSelect(pkg.id)}
                >
                  {pkg.popular && (
                    <div className="absolute -top-3 right-4 bg-cyan-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      Más Popular
                    </div>
                  )}

                  <div className="text-center mb-4">
                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                      {pkg.name}
                    </h3>
                    <div className="text-4xl font-bold text-cyan-600 mb-1">
                      {formatCurrency(pkg.credits)}
                    </div>
                    <p className="text-sm text-slate-600">en créditos</p>
                  </div>

                  {pkg.bonus && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                      <p className="text-sm font-semibold text-green-700 text-center">
                        + {formatCurrency(pkg.bonus)} de bonus
                      </p>
                    </div>
                  )}

                  <div className="text-center mb-4">
                    <div className="text-2xl font-bold text-slate-900">
                      {formatCurrency(pkg.price)}
                    </div>
                    {pkg.bonus && (
                      <p className="text-xs text-slate-600 mt-1">
                        Total: {formatCurrency(pkg.credits + pkg.bonus)}
                      </p>
                    )}
                  </div>

                  <button
                    className={`w-full py-2 rounded-lg font-medium transition-all ${
                      pkg.popular
                        ? 'bg-cyan-500 hover:bg-cyan-600 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                    }`}
                  >
                    Seleccionar
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="max-w-md mx-auto">
              {loading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mx-auto mb-4" />
                  <p className="text-slate-600">Preparando el pago...</p>
                </div>
              ) : clientSecret && selectedPkg ? (
                <div>
                  <div className="bg-slate-50 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold text-slate-900 mb-2">Resumen</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Paquete:</span>
                        <span className="font-medium">{selectedPkg.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Créditos:</span>
                        <span className="font-medium">{formatCurrency(selectedPkg.credits)}</span>
                      </div>
                      {selectedPkg.bonus && (
                        <div className="flex justify-between text-green-600">
                          <span>Bonus:</span>
                          <span className="font-medium">+{formatCurrency(selectedPkg.bonus)}</span>
                        </div>
                      )}
                      <div className="border-t pt-2 flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span>{formatCurrency(selectedPkg.price)}</span>
                      </div>
                    </div>
                  </div>

                  <Elements
                    stripe={getStripe()}
                    options={{
                      clientSecret,
                      appearance: {
                        theme: 'stripe',
                        variables: {
                          colorPrimary: '#06b6d4',
                        },
                      },
                    }}
                  >
                    <PaymentForm
                      amount={selectedPkg.price}
                      onSuccess={handleSuccess}
                      onError={handleError}
                    />
                  </Elements>

                  <button
                    onClick={() => {
                      setSelectedPackage(null);
                      setClientSecret(null);
                      setError('');
                    }}
                    className="w-full mt-4 text-slate-600 hover:text-slate-900 text-sm"
                  >
                    ← Cambiar paquete
                  </button>
                </div>
              ) : null}
            </div>
          )}

          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Error</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Comisión de Plataforma:</strong> Aplicamos una comisión del 10% en cada recarga.
              Por ejemplo, si recargas 100€, recibirás 90€ en créditos usables.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
