import { Activity, CreditCard, Shield, Users } from 'lucide-react';
import { AuditLog, Profile, StripePayment } from '../../../lib/supabase';
import { DataTable, ColumnDefinition } from '../components/DataTable';

interface AdminOverviewProps {
  profiles: Profile[];
  payments: StripePayment[];
  auditLogs: AuditLog[];
}

export function AdminOverview({ profiles, payments, auditLogs }: AdminOverviewProps) {
  const recentAudit = auditLogs.slice(0, 6);
  const totalCredits = profiles.reduce((acc, profile) => acc + (profile.credits || 0), 0);
  const totalPayments = payments.reduce((acc, payment) => acc + (payment.amount || 0), 0);

  const auditColumns: ColumnDefinition<AuditLog>[] = [
    { key: 'action', label: 'Acción' },
    { key: 'actor', label: 'Actor' },
    { key: 'role', label: 'Rol' },
    { key: 'entity', label: 'Entidad' },
    { key: 'severity', label: 'Severidad' },
    {
      key: 'created_at',
      label: 'Fecha',
      render: row => new Date(row.created_at).toLocaleString(),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-indigo-600 font-semibold">Usuarios</p>
              <p className="text-3xl font-bold text-slate-900">{profiles.length}</p>
              <p className="text-sm text-slate-500">Perfiles activos en Supabase</p>
            </div>
            <Users className="w-8 h-8 text-indigo-500" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-green-600 font-semibold">Pagos Stripe</p>
              <p className="text-3xl font-bold text-slate-900">{payments.length}</p>
              <p className="text-sm text-slate-500">Transacciones sincronizadas</p>
            </div>
            <CreditCard className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-amber-600 font-semibold">Créditos</p>
              <p className="text-3xl font-bold text-slate-900">{totalCredits.toFixed(2)}€</p>
              <p className="text-sm text-slate-500">Saldo acumulado</p>
            </div>
            <Shield className="w-8 h-8 text-amber-500" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-cyan-600 font-semibold">Trazabilidad</p>
              <p className="text-3xl font-bold text-slate-900">{auditLogs.length}</p>
              <p className="text-sm text-slate-500">Eventos en audit_logs</p>
            </div>
            <Activity className="w-8 h-8 text-cyan-500" />
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-indigo-600 font-semibold">Auditoría reciente</p>
            <h2 className="text-xl font-bold text-slate-900">Últimos eventos críticos</h2>
            <p className="text-sm text-slate-600">Conectado directamente con la tabla audit_logs</p>
          </div>
        </div>

        <DataTable
          data={recentAudit}
          columns={auditColumns}
          rowKey={row => row.id}
          emptyState="Sin registros de auditoría"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-green-600 font-semibold">Stripe</p>
            <h2 className="text-xl font-bold text-slate-900">Pagos y facturas</h2>
            <p className="text-sm text-slate-600">Consolidado desde stripe_payments</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600">
          <div className="p-3 rounded-lg bg-slate-50">
            <p className="text-slate-500">Total procesado</p>
            <p className="text-lg font-semibold text-slate-900">{totalPayments.toFixed(2)}€</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50">
            <p className="text-slate-500">Pagos exitosos</p>
            <p className="text-lg font-semibold text-emerald-600">{payments.filter(p => p.status === 'succeeded').length}</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50">
            <p className="text-slate-500">Pendientes</p>
            <p className="text-lg font-semibold text-amber-600">{payments.filter(p => p.status !== 'succeeded').length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
