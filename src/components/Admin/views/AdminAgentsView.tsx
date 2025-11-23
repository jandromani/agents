import { AlertTriangle } from 'lucide-react';
import { Agent, AuditLog, Profile } from '../../../lib/supabase';
import { DataTable, ColumnDefinition, FilterDefinition } from '../components/DataTable';
import { logInfo } from '../../../observability';

interface AdminAgentsViewProps {
  agents: Agent[];
  profiles: Profile[];
  auditLogs: AuditLog[];
}

export function AdminAgentsView({ agents, profiles, auditLogs }: AdminAgentsViewProps) {
  const profileMap = new Map(profiles.map(profile => [profile.id, profile.email]));
  const flaggedAgents = auditLogs.filter(log => log.entity === 'agent' && log.severity !== 'info').map(log => log.action);

  const columns: ColumnDefinition<Agent>[] = [
    {
      key: 'name',
      label: 'Agente',
      render: row => (
        <div>
          <p className="font-semibold text-slate-900">{row.name}</p>
          <p className="text-xs text-slate-500">{row.model}</p>
        </div>
      ),
    },
    {
      key: 'user_id',
      label: 'Owner',
      render: row => profileMap.get(row.user_id) || row.user_id,
    },
    {
      key: 'status',
      label: 'Estado',
      render: row => (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          row.status === 'active'
            ? 'bg-emerald-100 text-emerald-700'
            : row.status === 'deploying'
              ? 'bg-amber-100 text-amber-700'
              : row.status === 'error'
                ? 'bg-red-100 text-red-700'
                : 'bg-slate-100 text-slate-700'
        }`}>
          {row.status}
        </span>
      ),
    },
    {
      key: 'total_queries',
      label: 'Consultas',
      render: row => row.total_queries ?? 0,
    },
    {
      key: 'updated_at',
      label: 'Última actualización',
      render: row => (row.updated_at ? new Date(row.updated_at).toLocaleString() : 'N/A'),
    },
  ];

  const filters: FilterDefinition<Agent>[] = [
    {
      key: 'status',
      label: 'Estado',
      options: [
        { label: 'Activos', value: 'active' },
        { label: 'Inactivos', value: 'inactive' },
        { label: 'En despliegue', value: 'deploying' },
        { label: 'Error', value: 'error' },
      ],
    },
  ];

  const bulkActions = [
    {
      label: 'Pausar agentes',
      onAction: (rows: Agent[]) => {
        logInfo('Acción masiva: pausar agentes', { ids: rows.map(r => r.id) });
      },
    },
    {
      label: 'Refrescar auditoría',
      onAction: (rows: Agent[]) => {
        logInfo('Sincronizar auditoría para agentes', { ids: rows.map(r => r.id) });
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-indigo-600 font-semibold">Supervisión</p>
          <h2 className="text-2xl font-bold text-slate-900">Agentes monitoreados</h2>
          <p className="text-sm text-slate-600">Cruce directo con audit_logs para riesgos y trazabilidad.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-amber-600">
          <AlertTriangle className="w-4 h-4" />
          <span>{flaggedAgents.length} eventos de riesgo</span>
        </div>
      </div>

      <DataTable
        data={agents}
        columns={columns}
        filters={filters}
        rowKey={row => row.id}
        bulkActions={bulkActions}
        emptyState="No hay agentes registrados"
      />
    </div>
  );
}
