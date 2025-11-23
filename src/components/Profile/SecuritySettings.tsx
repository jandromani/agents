import { useCallback, useEffect, useMemo, useState } from 'react';
import { ShieldCheck, ShieldOff, Copy, QrCode, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface TotpStatusResponse {
  success: boolean;
  totpEnabled?: boolean;
  error?: string;
}

interface TotpInitiateResponse {
  success: boolean;
  secret: string;
  otpauthUrl: string;
  error?: string;
}

interface TotpActivateResponse {
  success: boolean;
  backupCodes?: string[];
  error?: string;
}

type Stage = 'idle' | 'pending' | 'confirming';

export function SecuritySettings() {
  const [stage, setStage] = useState<Stage>('idle');
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [secret, setSecret] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const qrUrl = useMemo(() =>
    otpauthUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}` : ''
  , [otpauthUrl]);

  const callFunction = async <T,>(body: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No autenticado');

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-2fa`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'No se pudo completar la acción de seguridad');
    }
    return data as T;
  };

  const loadStatus = useCallback(async () => {
    try {
      const data = await callFunction<TotpStatusResponse>({ action: 'status' });
      setTotpEnabled(Boolean(data.totpEnabled));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No se pudo cargar el estado de 2FA';
      setError(message);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const startSetup = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const data = await callFunction<TotpInitiateResponse>({ action: 'initiate' });
      setSecret(data.secret);
      setOtpauthUrl(data.otpauthUrl);
      setStage('pending');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No se pudo iniciar la configuración de 2FA';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const activateTotp = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const data = await callFunction<TotpActivateResponse>({
        action: 'activate',
        secret,
        token: verificationCode,
      });
      setBackupCodes(data.backupCodes || []);
      setTotpEnabled(true);
      setStage('confirming');
      setSuccess('Autenticación en dos pasos activada');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No se pudo activar 2FA';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const disableTotp = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await callFunction({ action: 'disable' });
      setTotpEnabled(false);
      setSecret('');
      setOtpauthUrl('');
      setVerificationCode('');
      setBackupCodes([]);
      setStage('idle');
      setSuccess('Autenticación en dos pasos desactivada');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No se pudo desactivar 2FA';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const copyCodes = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join('\n'));
      setSuccess('Códigos de respaldo copiados');
    } catch (_err) {
      setError('No se pudieron copiar los códigos');
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${totpEnabled ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
            {totpEnabled ? <ShieldCheck className="w-5 h-5" /> : <ShieldOff className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Seguridad de la cuenta</h3>
            <p className="text-sm text-slate-600">Protege tu sesión con TOTP y códigos de respaldo.</p>
          </div>
        </div>
        {totpEnabled ? (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">2FA activa</span>
        ) : (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">2FA inactiva</span>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 flex items-start space-x-2 mb-4">
          <AlertTriangle className="w-4 h-4 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3 flex items-start space-x-2 mb-4">
          <CheckCircle className="w-4 h-4 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {stage === 'idle' && !totpEnabled && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Configura un autenticador (Google Authenticator, 1Password, Authy) para añadir una capa extra de seguridad.
          </p>
          <button
            onClick={startSetup}
            disabled={loading}
            className="w-full md:w-auto bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white px-4 py-2 rounded-lg font-semibold transition-all disabled:opacity-50"
          >
            {loading ? 'Preparando...' : 'Configurar 2FA'}
          </button>
        </div>
      )}

      {stage === 'pending' && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Escanea este código QR con tu app autenticadora o ingresa manualmente la clave.
            </p>
            {qrUrl && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center justify-center">
                <img src={qrUrl} alt="Código QR para 2FA" className="w-40 h-40" />
              </div>
            )}
          </div>
          <div className="space-y-3">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 text-slate-700 text-sm font-semibold">
                <QrCode className="w-4 h-4" />
                <span>Clave secreta</span>
              </div>
              <p className="font-mono text-sm mt-2 break-all">{secret}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Ingresa el código de 6 dígitos</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="123456"
              />
            </div>
            <button
              onClick={activateTotp}
              disabled={loading || verificationCode.length < 6}
              className="w-full bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-semibold transition-all disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verificando...</span>
                </span>
              ) : 'Activar 2FA'}
            </button>
          </div>
        </div>
      )}

      {totpEnabled && (
        <div className="mt-4 space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
            Mantén tus códigos de respaldo en un lugar seguro. Te permitirán acceder si pierdes tu autenticador.
          </div>

          {backupCodes.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2 text-sm font-semibold text-slate-700">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Códigos de respaldo</span>
                </div>
                <button
                  onClick={copyCodes}
                  className="text-xs text-cyan-600 hover:text-cyan-700 inline-flex items-center space-x-1"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copiar</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-sm text-slate-800">
                {backupCodes.map((code) => (
                  <span key={code} className="px-2 py-1 bg-white border border-slate-200 rounded">{code}</span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={disableTotp}
            disabled={loading}
            className="w-full md:w-auto bg-red-50 text-red-700 border border-red-200 px-4 py-2 rounded-lg font-semibold hover:bg-red-100 disabled:opacity-50"
          >
            Desactivar 2FA
          </button>
        </div>
      )}
    </div>
  );
}
