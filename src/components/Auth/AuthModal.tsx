import { useState } from 'react';
import { X, Mail, Lock, User, AlertCircle, CheckCircle, RotateCcw } from 'lucide-react';
import { useAuth, MfaChallengeState } from '../../contexts/AuthContext';
import { rateLimiter, RATE_LIMITS, validateEmail, validatePassword, logSecurityEvent } from '../../lib/security';
import { TurnstileWidget } from './TurnstileWidget';
import { verifyTurnstileToken } from '../../lib/captcha';
import { supabase } from '../../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'signin' | 'signup';
}

export function AuthModal({ isOpen, onClose, defaultMode = 'signin' }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [mfaChallenge, setMfaChallenge] = useState<MfaChallengeState | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const { signIn, signUp, verifyMfaChallenge } = useAuth();

  if (!isOpen) return null;

  const handlePasswordChange = (newPassword: string) => {
    setPassword(newPassword);
    if (mode === 'signup' && newPassword.length > 0) {
      const validation = validatePassword(newPassword);
      setPasswordErrors(validation.errors);
    } else {
      setPasswordErrors([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!validateEmail(email)) {
        throw new Error('Email inválido');
      }

      if (mode === 'signin' && mfaChallenge) {
        if (totpCode.length < 6) {
          throw new Error('Introduce el código de 6 dígitos para continuar');
        }

        const { error: mfaError } = await verifyMfaChallenge(mfaChallenge, totpCode);
        if (mfaError) throw mfaError;

        await logSecurityEvent('login_mfa_verified', mfaChallenge.email, { email }, 'low');
        setMfaChallenge(null);
        setTotpCode('');
        rateLimiter.reset(`signin_${email}`);
        onClose();
        return;
      }

      if (mode === 'reset') {
        await verifyTurnstileToken(captchaToken, 'password_reset');
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

          if (error) throw error;
          setSuccess('Hemos enviado un enlace para restablecer tu contraseña. Revisa tu correo.');
          setMode('signin');
          return;
        }

      const rateLimitKey = `${mode}_${email}`;
      const rateLimit = mode === 'signup' ? RATE_LIMITS.AUTH.REGISTER : RATE_LIMITS.AUTH.LOGIN;
      const rateLimitCheck = rateLimiter.check(rateLimitKey, rateLimit);

      if (!rateLimitCheck.allowed) {
        await logSecurityEvent(
          `rate_limit_exceeded_${mode}`,
          null,
          { email, retryAfter: rateLimitCheck.retryAfter },
          'medium'
        );
        throw new Error(
          `Demasiados intentos. Por favor, espera ${rateLimitCheck.retryAfter} segundos.`
        );
      }

      if (mode === 'signup') {
        await verifyTurnstileToken(captchaToken, 'signup');
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
          throw new Error('La contraseña no cumple los requisitos de seguridad');
        }

        const { error } = await signUp(email, password, fullName);
        if (error) throw error;

        await logSecurityEvent('user_registered', null, { email }, 'low');
        rateLimiter.reset(rateLimitKey);
        onClose();
        return;
      }

      const { error, mfaChallenge: challenge } = await signIn(email, password);
      if (error) {
        await logSecurityEvent(
          'login_failed',
          null,
          { email, reason: error.message },
          'medium'
        );
        throw error;
      }

      if (challenge) {
        setMfaChallenge(challenge);
        setSuccess('Validación 2FA requerida. Ingresa el código de tu autenticador.');
        return;
      }

      await logSecurityEvent('login_success', null, { email }, 'low');

      rateLimiter.reset(rateLimitKey);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ha ocurrido un error';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            {mode === 'signin' && 'Bienvenido'}
            {mode === 'signup' && 'Crear Cuenta'}
            {mode === 'reset' && 'Recuperar acceso'}
          </h2>
          <p className="text-slate-600 mb-6">
            {mode === 'signin' && 'Ingresa a tu cuenta para gestionar tus agentes'}
            {mode === 'signup' && 'Crea tu cuenta gratis y empieza en minutos'}
            {mode === 'reset' && 'Te enviaremos un enlace seguro para restablecer tu contraseña'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nombre Completo
                </label>
                <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                  placeholder="Juan Pérez"
                />
              </div>
            </div>
          )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            {mode === 'signin' && mfaChallenge && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Código 2FA
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    required
                    minLength={6}
                    maxLength={6}
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                    placeholder="123456"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">Usa tu app autenticadora o un código de respaldo.</p>
              </div>
            )}

            {mode !== 'reset' && !mfaChallenge && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    required
                    minLength={mode === 'signup' ? 12 : 6}
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
                {mode === 'signup' && password.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {passwordErrors.length > 0 ? (
                      passwordErrors.map((error, idx) => (
                        <div key={idx} className="flex items-center space-x-2 text-xs text-red-600">
                          <AlertCircle className="w-3 h-3" />
                          <span>{error}</span>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center space-x-2 text-xs text-green-600">
                        <CheckCircle className="w-3 h-3" />
                        <span>Contraseña segura</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {(mode === 'signup' || mode === 'reset') && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">Protegido por Cloudflare Turnstile</p>
                <TurnstileWidget
                  action={mode === 'signup' ? 'signup' : 'password_reset'}
                  onToken={setCaptchaToken}
                />
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-green-700 text-sm">{success}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? 'Procesando...'
                : mode === 'signin'
                  ? 'Ingresar'
                  : mode === 'signup'
                    ? 'Crear Cuenta'
                    : 'Enviar enlace seguro'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError('');
                setSuccess('');
                setMfaChallenge(null);
                setTotpCode('');
              }}
              className="text-cyan-600 hover:text-cyan-700 font-medium"
            >
              {mode === 'signin'
                ? '¿No tienes cuenta? Regístrate'
                : '¿Ya tienes cuenta? Inicia sesión'}
            </button>
            {mode !== 'reset' && (
              <div className="mt-3">
                <button
                  onClick={() => {
                    setMode('reset');
                    setError('');
                    setSuccess('');
                    setMfaChallenge(null);
                    setTotpCode('');
                  }}
                  className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center space-x-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>¿Olvidaste tu contraseña?</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
  );
}
