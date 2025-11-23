import { useMemo } from 'react';
import { Activity, AlarmClockCheck, BarChart3, Send, ShieldAlert, Timer } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotificationEngine } from './useNotificationEngine';
import { NotificationPriority } from '../../lib/notifications/types';

const priorityLabel: Record<NotificationPriority, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};

export function NotificationAdminPanel() {
  const { profile } = useAuth();
  const { snapshot, pending, history, scheduleNotification } = useNotificationEngine(profile?.id);

  const sendTestNotification = (priority: NotificationPriority, scheduled?: boolean) => {
    const scheduledFor = scheduled ? new Date(Date.now() + 5 * 60 * 1000).toISOString() : undefined;
    scheduleNotification({
      channels: ['push', 'email', 'sms'],
      priority,
      scheduledFor,
      template: {
        subject: `Notificación de prueba (${priorityLabel[priority]})`,
        body: scheduled
          ? 'Mensaje programado para validar entregas diferidas y reintentos.'
          : 'Mensaje inmediato para probar fanout multi-canal y redundancia.',
      },
    });
  };

  const insights = useMemo(
    () => [
      { label: 'En cola', value: snapshot.queued, icon: <AlarmClockCheck className="w-4 h-4" /> },
      { label: 'Programadas', value: snapshot.scheduled, icon: <Timer className="w-4 h-4" /> },
      { label: 'Entregadas hoy', value: snapshot.deliveredToday, icon: <Send className="w-4 h-4" /> },
      { label: 'Reintentos', value: snapshot.retries, icon: <ShieldAlert className="w-4 h-4" /> },
    ],
    [snapshot]
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <BarChart3 className="w-5 h-5 text-blue-500" />
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Monitoreo de notificaciones</h3>
            <p className="text-sm text-slate-600">Prioridad, entregabilidad y estado de la cola.</p>
          </div>
        </div>
        <div className="space-x-2">
          <button
            onClick={() => sendTestNotification('high')}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500"
          >
            Lanzar alerta crítica
          </button>
          <button
            onClick={() => sendTestNotification('medium', true)}
            className="px-3 py-2 bg-slate-800 text-white rounded-lg text-sm hover:bg-slate-700"
          >
            Programar envío
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4 mb-6">
        {insights.map(item => (
          <div key={item.label} className="border border-slate-100 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-slate-700">
              <span className="p-2 bg-slate-100 rounded-lg text-slate-700">{item.icon}</span>
              <div>
                <p className="text-xs text-slate-500">{item.label}</p>
                <p className="text-lg font-semibold">{item.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="border border-slate-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2 text-slate-800">
              <Activity className="w-4 h-4" />
              <span className="font-semibold">Cola activa</span>
            </div>
            <span className="text-xs text-slate-500">{pending.length} pendientes</span>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {pending.length === 0 && <p className="text-sm text-slate-500">Sin pendientes</p>}
            {pending.map(job => (
              <div key={job.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-700 font-semibold">{job.template.subject}</div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      job.priority === 'high'
                        ? 'bg-red-100 text-red-700'
                        : job.priority === 'medium'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {priorityLabel[job.priority]}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Canales: {job.channels.join(', ')}</p>
                {job.scheduledFor && (
                  <p className="text-xs text-blue-600 mt-1">
                    Programada para {new Date(job.scheduledFor).toLocaleString('es-ES')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="border border-slate-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2 text-slate-800">
              <Send className="w-4 h-4" />
              <span className="font-semibold">Historial reciente</span>
            </div>
            <span className="text-xs text-slate-500">{history.length} completadas</span>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {history.length === 0 && <p className="text-sm text-slate-500">Aún no hay entregas</p>}
            {history.map(job => (
              <div key={job.id} className="p-3 border border-slate-100 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-800 font-semibold">{job.template.subject}</p>
                    <p className="text-xs text-slate-500">{job.channels.join(' • ')}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      job.status === 'failed'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {job.status === 'failed' ? 'Fallida' : 'Entregada'}
                  </span>
                </div>
                {job.metadata?.lastError && (
                  <p className="text-xs text-red-600 mt-1">Error: {job.metadata.lastError}</p>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  Intentos: {job.attempts.length} • Última actualización: {new Date(job.updatedAt).toLocaleTimeString('es-ES')}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
