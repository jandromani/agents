import { Shield, UserCheck } from 'lucide-react';
import { AuditLog } from '../../../lib/supabase';
import { DataTable, ColumnDefinition, FilterDefinition } from '../components/DataTable';

interface AdminAuditViewProps {
  auditLogs: AuditLog[];
}

export function AdminAuditView({ auditLogs }: AdminAuditViewProps) {
  const columns: ColumnDefinition<AuditLog>[] = [
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

  const filters: FilterDefinition<AuditLog>[] = [
    {
      key: 'severity',
      label: 'Severidad',
      options: [
        { label: 'Info', value: 'info' },
        { label: 'Warning', value: 'warning' },
        { label: 'Critical', value: 'critical' },
      ],
    },
    {
      key: 'role',
      label: 'Rol',
      options: [
        { label: 'Superadmin', value: 'superadmin' },
        { label: 'Soporte', value: 'soporte' },
        { label: 'Finanzas', value: 'finanzas' },
        { label: 'Moderador', value: 'moderador' },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-indigo-600 font-semibold">Auditoría</p>
          <h2 className="text-2xl font-bold text-slate-900">Eventos trazables</h2>
          <p className="text-sm text-slate-600">Cada acción queda registrada en audit_logs con rol y severidad.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-emerald-600">
          <Shield className="w-4 h-4" />
          <span>Monitoreo activo</span>
        </div>
      </div>

      <DataTable
        data={auditLogs}
        columns={columns}
        filters={filters}
        rowKey={row => row.id}
        emptyState="No hay eventos registrados"
      />

      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
        <UserCheck className="w-5 h-5 text-emerald-700 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-emerald-800">Roles dedicados</p>
          <p className="text-sm text-emerald-900">
            La ruta /admin solo permite superadmin, soporte, finanzas y moderador, preservando la segregación de funciones.
          </p>
        </div>
      </div>
    </div>
  );
}
