import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Agent, PLAN_LIMITS } from '../../lib/supabase';
import { Plus, Bot, TrendingUp, CreditCard, Settings, LogOut, Activity, Zap } from 'lucide-react';
import { AgentCard } from './AgentCard';
import { CreateAgentWizard } from './CreateAgentWizard';
import { StatsCard } from './StatsCard';
import { NotificationBell } from '../Notifications/NotificationBell';
import { CreditPurchase } from '../Billing/CreditPurchase';

export function Dashboard() {
  const { profile, signOut } = useAuth();
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
    if (profile) {
      loadAgents();
      loadStats();
    }
  }, [profile]);

  const loadAgents = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });

    if (data) {
      setAgents(data);
    }
    setLoading(false);
  };

  const loadStats = async () => {
    if (!profile) return;

    const { data: usageData } = await supabase
      .from('usage_logs')
      .select('tokens_used, created_at')
      .eq('user_id', profile.id);

    if (usageData) {
      const totalQueries = usageData.length;
      const now = new Date();
      const thisMonth = usageData.filter(log => {
        const logDate = new Date(log.created_at);
        return logDate.getMonth() === now.getMonth() &&
               logDate.getFullYear() === now.getFullYear();
      }).length;

      setStats({
        totalQueries,
        activeAgents: agents.filter(a => a.status === 'active').length,
        queriesThisMonth: thisMonth,
      });
    }
  };

  const handleAgentCreated = () => {
    setShowCreateWizard(false);
    loadAgents();
    loadStats();
  };

  const handleDeleteAgent = async (agentId: string) => {
    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', agentId);

    if (!error) {
      loadAgents();
      loadStats();
    }
  };

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
            </div>
          )}
        </div>
      </div>

      {showCreateWizard && (
        <CreateAgentWizard
          onClose={() => setShowCreateWizard(false)}
          onSuccess={handleAgentCreated}
        />
      )}

      <CreditPurchase
        isOpen={showCreditPurchase}
        onClose={() => setShowCreditPurchase(false)}
        onSuccess={() => {
          loadStats();
          window.location.reload();
        }}
      />
    </div>
  );
}
