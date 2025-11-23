import { Profile, RoleType } from '../../../lib/supabase';
import { DataTable, ColumnDefinition, FilterDefinition } from '../components/DataTable';
import { supabase } from '../../../lib/supabase';
import { logError, logInfo, traceAsyncOperation } from '../../../observability';

interface AdminUsersViewProps {
  profiles: Profile[];
  refreshProfiles: (profiles: Profile[]) => void;
}

export function AdminUsersView({ profiles, refreshProfiles }: AdminUsersViewProps) {
  const columns: ColumnDefinition<Profile>[] = [
    {
      key: 'full_name',
      label: 'Nombre',
      render: row => (
        <div>
          <p className="font-semibold text-slate-900">{row.full_name || row.email}</p>
          <p className="text-xs text-slate-500">{row.email}</p>
        </div>
      ),
    },
    { key: 'role', label: 'Rol' },
    { key: 'plan_type', label: 'Plan' },
    {
      key: 'credits',
      label: 'Créditos',
      render: row => `${row.credits?.toFixed(2) ?? '0.00'}€`,
    },
    {
      key: 'created_at',
      label: 'Alta',
      render: row => new Date(row.created_at).toLocaleDateString(),
    },
  ];

  const filters: FilterDefinition<Profile>[] = [
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
    {
      key: 'plan_type',
      label: 'Plan',
      options: [
        { label: 'Free', value: 'free' },
        { label: 'Premium Básico', value: 'premium_basic' },
        { label: 'Premium Ultra', value: 'premium_ultra' },
      ],
    },
  ];

  const updateRole = async (userIds: string[], role: RoleType) => {
    await traceAsyncOperation('admin.users.updateRole', async () => {
      const { error, data } = await supabase
        .from('profiles')
        .update({ role })
        .in('id', userIds)
        .select('*');

      if (error) {
        logError('Error actualizando roles', { error, userIds, role });
        return;
      }

      if (data) {
        const updated = profiles.map(profile => data.find(item => item.id === profile.id) ?? profile);
        refreshProfiles(updated as Profile[]);
        logInfo('Roles actualizados para usuarios', { role, total: data.length });
      }
    }, { op: 'db', tags: { feature: 'admin-users' } });
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-indigo-600 font-semibold">Control de acceso</p>
        <h2 className="text-2xl font-bold text-slate-900">Usuarios y roles protegidos</h2>
        <p className="text-sm text-slate-600">Solo roles superadmin/soporte/finanzas/moderador pueden operar en este panel.</p>
      </div>

      <DataTable
        data={profiles}
        columns={columns}
        filters={filters}
        rowKey={row => row.id}
        bulkActions={[
          {
            label: 'Asignar moderador',
            onAction: rows => updateRole(rows.map(r => r.id), 'moderador'),
          },
          {
            label: 'Mover a finanzas',
            onAction: rows => updateRole(rows.map(r => r.id), 'finanzas'),
          },
          {
            label: 'Suspender acceso',
            onAction: rows => updateRole(rows.map(r => r.id), 'viewer'),
          },
        ]}
        emptyState="No hay perfiles cargados"
      />
    </div>
  );
}
