import { Suspense, lazy, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Agent, PLAN_LIMITS } from '../../lib/supabase';
import { Plus, Bot, TrendingUp, CreditCard, Settings, LogOut, Activity, Zap, ShieldCheck } from 'lucide-react';
import { useRouter } from '../../contexts/RouterContext';
import { logError, logInfo, traceAsyncOperation } from '../../observability';
import { StatsCard } from './StatsCard';
import { NotificationBell } from '../Notifications/NotificationBell';

const AgentCard = lazy(() => import('./AgentCard').then(module => ({ default: module.AgentCard })));
const CreateAgentWizard = lazy(() => import('./CreateAgentWizard').then(module => ({ default: module.CreateAgentWizard })));
const NotificationPreferences = lazy(() => import('../Notifications/NotificationPreferences').then(module => ({ default: module.NotificationPreferences })));
const NotificationAdminPanel = lazy(() => import('../Notifications/NotificationAdminPanel').then(module => ({ default: module.NotificationAdminPanel })));
const CreditPurchase = lazy(() => import('../Billing/CreditPurchase').then(module => ({ default: module.CreditPurchase })));
const SecuritySettings = lazy(() => import('../Profile/SecuritySettings').then(module => ({ default: module.SecuritySettings })));

export function Dashboard() {
  const { profile, signOut } = useAuth();
  const { navigate } = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [showCreditPurchase, setShowCreditPurchase] = useState(false);
  const [stats, setStats] = useState({
    totalQueries: 0,
    activeAgents: 0,
    queriesThisMonth: 0,
  });

  useEffect(() => {
    if (!profile) return;

    const cachedAgents = sessionStorage.getItem(`agents:${profile.id}`);
    if (cachedAgents) {
      try {
        const parsed = JSON.parse(cachedAgents) as Agent[];
        setAgents(parsed);
        setStats(prev => ({
          ...prev,
          activeAgents: parsed.filter(agent => agent.status === 'active').length,
        }));
        setLoading(false);
      } catch (error) {
        logError('No se pudieron leer los agentes cacheados', { error });
      }
    } else {
      setLoading(true);
    }

    const cachedStats = sessionStorage.getItem(`stats:${profile.id}`);
    if (cachedStats) {
      try {
        const parsed = JSON.parse(cachedStats) as Partial<typeof stats>;
        setStats(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        logError('No se pudieron leer las estadísticas cacheadas', { error });
      }
    }

    loadAgents();
    loadStats();
  }, [profile]);

  const loadAgents = async () => traceAsyncOperation('dashboard.loadAgents', async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('agents')
      .select('id, name, description, model, status, total_queries, last_used_at, worker_url, updated_at')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });

    if (error) {
      logError('No se pudieron obtener los agentes', { error, userId: profile.id });
      setLoading(false);
      return;
    }

    const sanitizedAgents = data ?? [];
    setAgents(sanitizedAgents as Agent[]);
    setStats(prev => ({
      ...prev,
      activeAgents: sanitizedAgents.filter(agent => agent.status === 'active').length,
    }));
    sessionStorage.setItem(`agents:${profile.id}`, JSON.stringify(sanitizedAgents));
    logInfo('Agentes cargados', { total: sanitizedAgents.length });
    setLoading(false);
  }, { op: 'db', tags: { feature: 'dashboard', operation: 'agents' }, data: { userId: profile?.id } });

  const loadStats = async () => traceAsyncOperation('dashboard.loadStats', async () => {
    if (!profile) return;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [totalResult, monthlyResult] = await Promise.all([
      supabase
        .from('usage_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id),
      supabase
        .from('usage_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .gte('created_at', startOfMonth.toISOString()),
    ]);

    if (totalResult.error || monthlyResult.error) {
      logError('No se pudieron recuperar las estadísticas de uso', {
        totalError: totalResult.error,
        monthlyError: monthlyResult.error,
        userId: profile.id,
      });
      return;
    }

    const totalQueries = totalResult.count ?? 0;
    const thisMonth = monthlyResult.count ?? 0;

    setStats(prev => ({
      ...prev,
      totalQueries,
      queriesThisMonth: thisMonth,
    }));
    sessionStorage.setItem(`stats:${profile.id}`, JSON.stringify({
      totalQueries,
      queriesThisMonth: thisMonth,
    }));
    logInfo('Estadísticas de panel actualizadas', { totalQueries, thisMonth });
  }, { op: 'db', tags: { feature: 'dashboard', operation: 'stats' }, data: { userId: profile?.id } });

  const handleAgentCreated = () => {
    setShowCreateWizard(false);
    loadAgents();
    loadStats();
  };

  const handleDeleteAgent = async (agentId: string) => traceAsyncOperation('dashboard.deleteAgent', async () => {
    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', agentId);

    if (error) {
      logError('No se pudo eliminar el agente', { error, agentId });
      return;
    }

    logInfo('Agente eliminado', { agentId });
    loadAgents();
    loadStats();
  }, { op: 'db', tags: { feature: 'dashboard', operation: 'delete' }, data: { agentId } });

  const canCreateAgent = () => {
    if (!profile) return false;
    const limits = PLAN_LIMITS[profile.plan_type];
    return agents.length < limits.maxAgents;
  };

  const getPlanBadge = () => {
    const badges = {
      free: { text: 'Gratis', color: 'bg-slate-100 text-slate-700' },
      premium_basic: { text: 'Premium Básico', color: 'bg-cyan-100 text-cyan-700' },
      premium_ultra: { text: 'Premium Ultra', color: 'bg-blue-100 text-blue-700' },
    };
    return badges[profile?.plan_type || 'free'];
  };

  const adminRoles = ['admin', 'superadmin', 'soporte', 'finanzas', 'moderador'];
  const isAdminProfile = Boolean(
    (profile?.role && adminRoles.includes(profile.role)) ||
    profile?.permissions?.includes('admin') ||
    profile?.email?.toLowerCase().includes('admin')
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Bot className="w-12 h-12 text-cyan-500 animate-pulse mx-auto mb-4" />
          <p className="text-slate-600">Cargando tu panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Bot className="w-8 h-8 text-cyan-500" />
              <div>
                <h1 className="text-2xl font-bold text-slate-900">AgentHub</h1>
                <p className="text-sm text-slate-600">Panel de Control</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPlanBadge().color}`}>
                  {getPlanBadge().text}
                </span>
                <button
                  onClick={() => setShowCreditPurchase(true)}
                  className="flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 px-3 py-1 rounded-full transition-all"
                >
                  <CreditCard className="w-4 h-4 text-white" />
                  <span className="text-sm font-semibold text-white">
                    {profile?.credits?.toFixed(2) || '0.00'}€
                  </span>
                  <Zap className="w-3 h-3 text-white" />
                </button>
              </div>

              <NotificationBell />

              <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <Settings className="w-5 h-5 text-slate-600" />
              </button>

              {isAdminProfile && (
                <button
                  onClick={() => navigate('/admin')}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg border border-cyan-200 text-cyan-700 font-semibold hover:bg-cyan-50 transition-colors"
                >
                  <ShieldCheck className="w-5 h-5" />
                  <span>Panel admin</span>
                </button>
              )}

              <button
                onClick={signOut}
                className="flex items-center space-x-2 px-4 py-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5 text-slate-600" />
                <span className="text-sm font-medium text-slate-700">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <StatsCard
            icon={<Activity className="w-6 h-6" />}
            label="Consultas Totales"
            value={stats.totalQueries.toString()}
            color="cyan"
          />
          <StatsCard
            icon={<Bot className="w-6 h-6" />}
            label="Agentes Activos"
            value={`${stats.activeAgents}/${PLAN_LIMITS[profile?.plan_type || 'free'].maxAgents}`}
            color="blue"
          />
          <StatsCard
            icon={<TrendingUp className="w-6 h-6" />}
            label="Este Mes"
            value={stats.queriesThisMonth.toString()}
            color="green"
          />
        </div>

        {/* Agents Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Mis Agentes</h2>
              <p className="text-slate-600 mt-1">
                {agents.length} de {PLAN_LIMITS[profile?.plan_type || 'free'].maxAgents} agentes creados
              </p>
            </div>

            <button
              onClick={() => setShowCreateWizard(true)}
              disabled={!canCreateAgent()}
              className="flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-5 h-5" />
              <span>Crear Agente</span>
            </button>
          </div>

          {agents.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                Aún no tienes agentes
              </h3>
              <p className="text-slate-600 mb-6">
                Crea tu primer agente y empieza a automatizar tu atención al cliente
              </p>
              <button
                onClick={() => setShowCreateWizard(true)}
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white px-6 py-3 rounded-lg font-semibold transition-all"
              >
                <Plus className="w-5 h-5" />
                <span>Crear Mi Primer Agente</span>
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Suspense fallback={<div className="text-slate-500">Cargando agentes...</div>}>
                {agents.map(agent => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    onDelete={handleDeleteAgent}
                    onUpdate={() => {
                      loadAgents();
                      loadStats();
                    }}
                  />
                ))}
              </Suspense>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mt-8">
          <Suspense fallback={<div className="text-slate-500">Cargando notificaciones...</div>}>
            <NotificationPreferences />
          </Suspense>
          <Suspense fallback={<div className="text-slate-500">Cargando panel admin de alertas...</div>}>
            <NotificationAdminPanel />
          </Suspense>
        </div>

        <div className="mt-8">
          <Suspense fallback={<div className="text-slate-500">Cargando seguridad...</div>}>
            <SecuritySettings />
          </Suspense>
        </div>
      </div>

      <Suspense fallback={null}>
        {showCreateWizard && (
          <CreateAgentWizard
            onClose={() => setShowCreateWizard(false)}
            onSuccess={handleAgentCreated}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        <CreditPurchase
          isOpen={showCreditPurchase}
          onClose={() => setShowCreditPurchase(false)}
          onSuccess={() => {
            loadStats();
            window.location.reload();
          }}
        />
      </Suspense>

    </div>
  );
}
