import { useState } from 'react';
import { X, Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { rateLimiter, RATE_LIMITS, validateEmail, validatePassword, logSecurityEvent } from '../../lib/security';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'signin' | 'signup';
}

export function AuthModal({ isOpen, onClose, defaultMode = 'signin' }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const { signIn, signUp } = useAuth();

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
    setLoading(true);

    try {
      if (!validateEmail(email)) {
        throw new Error('Email inválido');
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
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
          throw new Error('La contraseña no cumple los requisitos de seguridad');
        }

        const { error } = await signUp(email, password, fullName);
        if (error) throw error;

        await logSecurityEvent('user_registered', null, { email }, 'low');
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          await logSecurityEvent(
            'login_failed',
            null,
            { email, reason: error.message },
            'medium'
          );
          throw error;
        }

        await logSecurityEvent('login_success', null, { email }, 'low');
      }

      rateLimiter.reset(rateLimitKey);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ha ocurrido un error');
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
          {mode === 'signin' ? 'Bienvenido' : 'Crear Cuenta'}
        </h2>
        <p className="text-slate-600 mb-6">
          {mode === 'signin'
            ? 'Ingresa a tu cuenta para gestionar tus agentes'
            : 'Crea tu cuenta gratis y empieza en minutos'}
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

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Procesando...' : mode === 'signin' ? 'Ingresar' : 'Crear Cuenta'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError('');
            }}
            className="text-cyan-600 hover:text-cyan-700 font-medium"
          >
            {mode === 'signin'
              ? '¿No tienes cuenta? Regístrate'
              : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        </div>
      </div>
    </div>
  );
}
