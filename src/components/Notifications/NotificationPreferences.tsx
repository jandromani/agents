import { useEffect, useMemo, useState } from 'react';
import { BellRing, Mail, Phone, Smartphone } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  NotificationPreference,
  NotificationPreferenceCategory,
  NotificationPreferenceChannelConfig,
} from '../../lib/notifications/types';

const preferenceCategories: NotificationPreferenceCategory[] = [
  {
    key: 'actividad',
    label: 'Actividad de Agentes',
    description: 'Alertas sobre agentes inactivos, fallos y nuevas consultas.',
  },
  {
    key: 'facturacion',
    label: 'Facturación y créditos',
    description: 'Pagos, compras de crédito y alertas de saldo bajo.',
  },
  {
    key: 'seguridad',
    label: 'Seguridad',
    description: 'Inicios de sesión sospechosos y cambios de configuración críticos.',
  },
];

const defaultChannelConfig: Record<string, NotificationPreferenceChannelConfig> = {
  push: { enabled: true },
  email: { enabled: true },
  sms: { enabled: false, quietHours: { start: '22:00', end: '08:00' } },
};

const buildDefaultChannels = (): Record<string, NotificationPreferenceChannelConfig> => ({
  push: { ...defaultChannelConfig.push },
  email: { ...defaultChannelConfig.email },
  sms: { ...defaultChannelConfig.sms },
});

export function NotificationPreferences() {
  const { profile } = useAuth();
  const storageKey = useMemo(() => `notification-preferences-${profile?.id ?? 'anon'}`, [profile]);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      setPreferences(JSON.parse(stored));
    } else {
      setPreferences(
        preferenceCategories.map(category => ({
          category: category.key,
          channels: buildDefaultChannels(),
          digest: 'immediate',
        }))
      );
    }
  }, [storageKey]);

  const toggleChannel = (category: string, channel: keyof typeof defaultChannelConfig) => {
    setPreferences(prev =>
      prev.map(pref => {
        if (pref.category !== category) return pref;
        return {
          ...pref,
          channels: {
            ...pref.channels,
            [channel]: {
              ...pref.channels[channel],
              enabled: !pref.channels[channel].enabled,
            },
          },
        };
      })
    );
  };

  const updateDigest = (category: string, value: 'immediate' | 'hourly' | 'daily') => {
    setPreferences(prev =>
      prev.map(pref => (pref.category === category ? { ...pref, digest: value } : pref))
    );
  };

  const savePreferences = () => {
    localStorage.setItem(storageKey, JSON.stringify(preferences));
    setStatus('Preferencias guardadas');
    setTimeout(() => setStatus(null), 2500);
  };

  const channelIcon = (channel: keyof typeof defaultChannelConfig) => {
    switch (channel) {
      case 'email':
        return <Mail className="w-4 h-4" />;
      case 'sms':
        return <Phone className="w-4 h-4" />;
      default:
        return <Smartphone className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6">
      <div className="flex items-center space-x-3 mb-4">
        <BellRing className="w-5 h-5 text-cyan-500" />
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Preferencias de notificación</h3>
          <p className="text-sm text-slate-600">Configura cómo quieres recibir avisos críticos.</p>
        </div>
      </div>

      <div className="space-y-4">
        {preferences.map(pref => {
          const category = preferenceCategories.find(cat => cat.key === pref.category);
          if (!category) return null;

          return (
            <div key={pref.category} className="border border-slate-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="font-semibold text-slate-900">{category.label}</h4>
                  <p className="text-sm text-slate-600">{category.description}</p>
                </div>
                <div className="space-x-2">
                  {(['push', 'email', 'sms'] as const).map(channel => (
                    <button
                      key={channel}
                      onClick={() => toggleChannel(pref.category, channel)}
                      className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm border transition-colors ${
                        pref.channels[channel].enabled
                          ? 'bg-cyan-50 border-cyan-200 text-cyan-700'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      {channelIcon(channel)}
                      <span className="capitalize">{channel}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-4 text-sm text-slate-600 mt-3">
                <span className="font-medium text-slate-700">Frecuencia:</span>
                {(['immediate', 'hourly', 'daily'] as const).map(option => (
                  <label key={option} className="inline-flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name={`digest-${pref.category}`}
                      checked={pref.digest === option}
                      onChange={() => updateDigest(pref.category, option)}
                      className="text-cyan-500"
                    />
                    <span className="capitalize">{option}</span>
                  </label>
                ))}
              </div>

              {pref.channels.sms?.enabled && pref.channels.sms.quietHours && (
                <p className="text-xs text-amber-600 mt-2">
                  Horario silencioso SMS: {pref.channels.sms.quietHours.start} - {pref.channels.sms.quietHours.end}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-slate-600">
          Elige canales alternativos para asegurar entregabilidad en caso de fallos.
        </div>
        <button
          onClick={savePreferences}
          className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 transition-colors"
        >
          Guardar cambios
        </button>
      </div>

      {status && <p className="text-sm text-green-600 mt-2">{status}</p>}
    </div>
  );
}
