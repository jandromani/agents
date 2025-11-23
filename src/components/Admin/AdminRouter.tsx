import { useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, CreditCard, FileText, ShieldCheck, Users } from 'lucide-react';
import { supabase, AuditLog, Profile, StripePayment, Agent } from '../../lib/supabase';
import { useRouter } from '../../contexts/RouterContext';
import { logError, logInfo, traceAsyncOperation } from '../../observability';
import { AdminOverview } from './views/AdminOverview';
import { AdminUsersView } from './views/AdminUsersView';
import { AdminAgentsView } from './views/AdminAgentsView';
import { AdminBillingView } from './views/AdminBillingView';
import { AdminAuditView } from './views/AdminAuditView';

export function AdminRouter() {
  const { path, navigate } = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [payments, setPayments] = useState<StripePayment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  const section = useMemo(() => {
    const [, , current] = path.split('/');
    if (!current) return 'overview';
    return current as 'overview' | 'users' | 'agents' | 'billing' | 'audit';
  }, [path]);

  useEffect(() => {
    traceAsyncOperation('admin.bootstrap', async () => {
      setLoading(true);
      const [profilesResult, paymentsResult, auditResult, agentsResult] = await Promise.all([
        supabase.from('profiles').select('*').limit(200),
        supabase.from('stripe_payments').select('*').limit(200),
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('agents').select('*').limit(200),
      ]);

      if (profilesResult.error) {
        logError('Error cargando perfiles', { error: profilesResult.error });
      } else if (profilesResult.data) {
        setProfiles(profilesResult.data as Profile[]);
      }

      if (paymentsResult.error) {
        logError('Error cargando pagos', { error: paymentsResult.error });
      } else if (paymentsResult.data) {
        setPayments(paymentsResult.data as StripePayment[]);
      }

      if (auditResult.error) {
        logError('Error cargando logs de auditoría', { error: auditResult.error });
      } else if (auditResult.data) {
        setAuditLogs(auditResult.data as AuditLog[]);
        logInfo('Logs de auditoría sincronizados', { total: auditResult.data.length });
      }

      if (agentsResult.error) {
        logError('Error cargando agentes', { error: agentsResult.error });
      } else if (agentsResult.data) {
        setAgents(agentsResult.data as Agent[]);
      }

      setLoading(false);
    }, { op: 'admin', tags: { feature: 'admin-router' } });
  }, []);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3, description: 'Salud y resumen ejecutivo' },
    { id: 'users', label: 'Usuarios', icon: Users, description: 'Control de acceso y roles' },
    { id: 'agents', label: 'Agentes', icon: ShieldCheck, description: 'Riesgos y despliegues' },
    { id: 'billing', label: 'Facturación', icon: CreditCard, description: 'Stripe y balance de créditos' },
    { id: 'audit', label: 'Auditoría', icon: FileText, description: 'Eventos y trazabilidad' },
  ];

  const renderView = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-600">Sincronizando panel admin...</p>
          </div>
        </div>
      );
    }

    switch (section) {
      case 'users':
        return <AdminUsersView profiles={profiles} refreshProfiles={setProfiles} />;
      case 'agents':
        return <AdminAgentsView profiles={profiles} auditLogs={auditLogs} agents={agents} />;
      case 'billing':
        return <AdminBillingView payments={payments} />;
      case 'audit':
        return <AdminAuditView auditLogs={auditLogs} />;
      case 'overview':
      default:
        return (
          <AdminOverview
            profiles={profiles}
            payments={payments}
            auditLogs={auditLogs}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-indigo-600 font-semibold">Panel Administrativo</p>
            <h1 className="text-2xl font-bold text-slate-900">Gobernanza y seguridad</h1>
            <p className="text-slate-600">Rutas protegidas con roles dedicados</p>
          </div>
          <div className="flex items-center space-x-2 text-sm text-slate-600">
            <Activity className="w-4 h-4 text-green-500" />
            <span>Activo y monitoreado</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-4 gap-4">
        <nav className="bg-white border border-slate-200 rounded-xl shadow-sm divide-y divide-slate-200">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = section === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigate(`/admin/${item.id}`)}
                className={`w-full text-left px-4 py-3 flex items-start space-x-3 transition-colors ${
                  isActive ? 'bg-indigo-50 border-l-4 border-indigo-500' : 'hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-slate-500'}`} />
                <div>
                  <p className={`font-semibold ${isActive ? 'text-slate-900' : 'text-slate-700'}`}>{item.label}</p>
                  <p className="text-xs text-slate-500">{item.description}</p>
                </div>
              </button>
            );
          })}
        </nav>

        <main className="lg:col-span-3 space-y-4">{renderView()}</main>
      </div>
    </div>
  );
}
