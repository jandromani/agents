import { Activity, AlertTriangle, CreditCard, Shield, TrendingUp, Users, Zap } from 'lucide-react';
import { AuditLog, Profile, StripePayment } from '../../../lib/supabase';
import { DataTable, ColumnDefinition } from '../components/DataTable';

interface AdminOverviewProps {
  profiles: Profile[];
  payments: StripePayment[];
  auditLogs: AuditLog[];
}

function StatCard({
  label, value, sub, icon: Icon, color, trend,
}: {
  label: string; value: string | number; sub: string;
  icon: React.ElementType; color: string;
  trend?: { value: number; positive: boolean };
}) {
  const bgColor = color.replace('text-', 'bg-').replace('-600', '-50');
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className={`text-xs uppercase tracking-wide font-semibold ${color}`}>{label}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1 truncate">{value}</p>
          <p className="text-sm text-slate-500 mt-0.5">{sub}</p>
          {trend && (
            <p className={`text-xs mt-1 font-medium ${trend.positive ? 'text-emerald-600' : 'text-red-500'}`}>
              {trend.positive ? '+' : ''}{trend.value}% vs mes anterior
            </p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ml-3 ${bgColor}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
    </div>
  );
}

function RevenueBar({ label, amount, max }: { label: string; amount: number; max: number }) {
  const pct = max > 0 ? Math.round((amount / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-slate-600 truncate max-w-[160px]">{label}</span>
        <span className="font-semibold text-slate-900 ml-2">€{(amount / 100).toFixed(2)}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function AdminOverview({ profiles, payments, auditLogs }: AdminOverviewProps) {
  const recentAudit = auditLogs.slice(0, 6);
  const totalCredits = profiles.reduce((acc, p) => acc + (p.credits || 0), 0);
  const totalRevenue = payments.filter(p => p.status === 'succeeded').reduce((acc, p) => acc + (p.amount || 0), 0);
  const criticalEvents = auditLogs.filter(l => l.severity === 'critical').length;
  const planCounts = profiles.reduce<Record<string, number>>((acc, p) => {
    acc[p.plan_type] = (acc[p.plan_type] || 0) + 1;
    return acc;
  }, {});

  const topPayerMap = new Map<string, number>();
  payments.filter(p => p.status === 'succeeded').forEach(p => {
    topPayerMap.set(p.customer_email, (topPayerMap.get(p.customer_email) || 0) + p.amount);
  });
  const topPayers = [...topPayerMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxPayer = topPayers[0]?.[1] || 1;

  const now = new Date();
  const thisMonthRevenue = payments.filter(p => {
    const d = new Date(p.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && p.status === 'succeeded';
  }).reduce((a, p) => a + p.amount, 0);
  const lastMonthRevenue = payments.filter(p => {
    const d = new Date(p.created_at);
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear() && p.status === 'succeeded';
  }).reduce((a, p) => a + p.amount, 0);
  const revTrend = lastMonthRevenue > 0
    ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
    : 0;

  const auditColumns: ColumnDefinition<AuditLog>[] = [
    { key: 'action', label: 'Acción' },
    { key: 'actor', label: 'Actor' },
    { key: 'entity', label: 'Entidad' },
    {
      key: 'severity',
      label: 'Severidad',
      render: row => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
          row.severity === 'critical' ? 'bg-red-100 text-red-700' :
          row.severity === 'warning' ? 'bg-amber-100 text-amber-700' :
          'bg-slate-100 text-slate-600'
        }`}>
          {row.severity || 'info'}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Fecha',
      render: row => new Date(row.created_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }),
    },
  ];

  const planLabels: Record<string, string> = { free: 'Free', premium_basic: 'Premium Básico', premium_ultra: 'Premium Ultra' };
  const planColors: Record<string, string> = { free: 'bg-slate-400', premium_basic: 'bg-blue-500', premium_ultra: 'bg-cyan-500' };
  const maxPlanCount = Math.max(...Object.values(planCounts), 1);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Usuarios" value={profiles.length} sub="Perfiles activos" icon={Users} color="text-blue-600" />
        <StatCard
          label="Ingresos totales" value={`€${(totalRevenue / 100).toFixed(2)}`} sub="Pagos confirmados"
          icon={CreditCard} color="text-emerald-600"
          trend={revTrend !== 0 ? { value: Math.abs(revTrend), positive: revTrend >= 0 } : undefined}
        />
        <StatCard label="Créditos activos" value={`€${totalCredits.toFixed(2)}`} sub="Saldo en cuentas" icon={Zap} color="text-amber-600" />
        <StatCard
          label="Alertas críticas" value={criticalEvents} sub="Eventos de auditoría"
          icon={criticalEvents > 0 ? AlertTriangle : Shield}
          color={criticalEvents > 0 ? 'text-red-600' : 'text-cyan-600'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-emerald-600 font-semibold">Planes</p>
              <h3 className="text-lg font-bold text-slate-900">Distribución de usuarios</h3>
            </div>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="space-y-3">
            {(['free', 'premium_basic', 'premium_ultra'] as const).map(plan => (
              <div key={plan} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">{planLabels[plan]}</span>
                  <span className="font-semibold text-slate-900">{planCounts[plan] || 0} usuarios</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${planColors[plan]} rounded-full transition-all duration-500`}
                    style={{ width: `${Math.round(((planCounts[plan] || 0) / maxPlanCount) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs text-slate-500">
            {(['free', 'premium_basic', 'premium_ultra'] as const).map(plan => (
              <div key={plan}>
                <p className="font-bold text-slate-900 text-base">{planCounts[plan] || 0}</p>
                <p>{planLabels[plan].split(' ')[0]}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-blue-600 font-semibold">Clientes</p>
              <h3 className="text-lg font-bold text-slate-900">Top 5 por ingresos</h3>
            </div>
            <Activity className="w-5 h-5 text-blue-500" />
          </div>
          {topPayers.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Sin datos de pago</p>
          ) : (
            <div className="space-y-3">
              {topPayers.map(([email, amount]) => (
                <RevenueBar key={email} label={email} amount={amount} max={maxPayer} />
              ))}
            </div>
          )}
          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-sm">
            <span className="text-slate-500">Ingresos este mes</span>
            <span className="font-bold text-slate-900">€{(thisMonthRevenue / 100).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Auditoría reciente</p>
            <h3 className="text-lg font-bold text-slate-900">Últimos eventos</h3>
          </div>
          {criticalEvents > 0 && (
            <div className="flex items-center gap-1.5 bg-red-50 text-red-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-red-200">
              <AlertTriangle className="w-3.5 h-3.5" />
              {criticalEvents} críticos
            </div>
          )}
        </div>
        <DataTable
          data={recentAudit}
          columns={auditColumns}
          rowKey={row => row.id}
          emptyState="Sin registros de auditoría"
        />
      </div>
    </div>
  );
}
