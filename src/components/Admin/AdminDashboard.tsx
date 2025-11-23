import { useMemo } from 'react';
import { Bell, Database, Shield, Users } from 'lucide-react';
import { notificationService } from '../../lib/notifications/service';

const cards = [
  { title: 'Usuarios', icon: Users, description: 'Gestión, roles, tickets y soporte', color: 'bg-cyan-50', accent: 'text-cyan-700' },
  { title: 'Agentes', icon: Database, description: 'Estados de despliegue, RAG y health checks', color: 'bg-indigo-50', accent: 'text-indigo-700' },
  { title: 'Seguridad', icon: Shield, description: 'Auditoría, 2FA, CAPTCHA y políticas CSP', color: 'bg-emerald-50', accent: 'text-emerald-700' },
  { title: 'Notificaciones', icon: Bell, description: 'Cola multi-canal con analytics de entregas', color: 'bg-amber-50', accent: 'text-amber-700' },
];

export function AdminDashboard() {
  const analytics = useMemo(() => notificationService.analytics(), []);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">Panel Operativo</p>
          <h1 className="text-2xl font-semibold text-slate-900">Administración avanzada</h1>
          <p className="text-slate-600 mt-1 max-w-2xl">
            Control centralizado de usuarios, agentes, seguridad, feature flags y notificaciones con trazabilidad.
          </p>
        </div>
        <div className="rounded-full bg-white px-4 py-2 shadow-sm border border-slate-200 text-sm text-slate-700">
          Notificaciones entregadas: <span className="font-semibold">{analytics.totalDelivered}</span>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.title} className={`rounded-xl border border-slate-200 shadow-sm p-4 ${card.color}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase">{card.title}</p>
                  <h3 className="text-lg font-semibold text-slate-900">{card.description}</h3>
                </div>
                <div className={`rounded-full p-2 bg-white border border-slate-200 ${card.accent}`}>
                  <Icon size={18} />
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-4">
          <h2 className="text-sm font-semibold text-slate-800">Cola de Notificaciones</h2>
          <p className="text-sm text-slate-600">Estado agregado por canal.</p>
          <dl className="grid grid-cols-2 gap-3 mt-3 text-sm text-slate-700">
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-xs text-slate-500">Email</dt>
              <dd className="font-semibold">{analytics.perChannel.email}</dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-xs text-slate-500">Push</dt>
              <dd className="font-semibold">{analytics.perChannel.push}</dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-xs text-slate-500">SMS</dt>
              <dd className="font-semibold">{analytics.perChannel.sms}</dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-xs text-slate-500">In-app</dt>
              <dd className="font-semibold">{analytics.perChannel.inapp}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-4">
          <h2 className="text-sm font-semibold text-slate-800">Playbooks rápidos</h2>
          <ul className="text-sm text-slate-700 list-disc list-inside space-y-2">
            <li>Activar modo de mantenimiento y rollback seguro.</li>
            <li>Revisar panel de errores (Sentry) y latencias (APM).</li>
            <li>Verificar colas y reintentos en canales críticos.</li>
            <li>Auditar acciones recientes en `audit_logs`.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
