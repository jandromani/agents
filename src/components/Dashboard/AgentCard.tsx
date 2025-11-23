import { Agent, supabase } from '../../lib/supabase';
import { Bot, Trash2, BarChart3, ExternalLink, Circle, Play, Rocket, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { AgentTester } from './AgentTester';

interface AgentCardProps {
  agent: Agent;
  onDelete: (agentId: string) => void;
  onUpdate: () => void;
}

export function AgentCard({ agent, onDelete, onUpdate }: AgentCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTester, setShowTester] = useState(false);
  const [deploying, setDeploying] = useState(false);

  const getStatusColor = () => {
    switch (agent.status) {
      case 'active':
        return 'text-green-500';
      case 'inactive':
        return 'text-slate-400';
      case 'deploying':
        return 'text-yellow-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-slate-400';
    }
  };

  const getStatusText = () => {
    switch (agent.status) {
      case 'active':
        return 'Activo';
      case 'inactive':
        return 'Inactivo';
      case 'deploying':
        return 'Desplegando';
      case 'error':
        return 'Error';
      default:
        return 'Desconocido';
    }
  };

  const handleDelete = () => {
    onDelete(agent.id);
    setShowDeleteConfirm(false);
  };

  const handleDeploy = async () => {
    setDeploying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deploy-agent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ agentId: agent.id }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Deployment failed');
      }

      onUpdate();
    } catch (error) {
      console.error('Deploy error:', error);
      alert('Error al desplegar el agente. Por favor, inténtalo de nuevo.');
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 mb-1">{agent.name}</h3>
            <div className="flex items-center space-x-2">
              <Circle className={`w-2 h-2 ${getStatusColor()} fill-current`} />
              <span className="text-sm text-slate-600">{getStatusText()}</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
        >
          <Trash2 className="w-5 h-5 text-slate-400 group-hover:text-red-500" />
        </button>
      </div>

      {agent.description && (
        <p className="text-sm text-slate-600 mb-4 line-clamp-2">{agent.description}</p>
      )}

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Modelo:</span>
          <span className="font-medium text-slate-900">{agent.model}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Consultas:</span>
          <span className="font-medium text-slate-900">{agent.total_queries}</span>
        </div>
        {agent.last_used_at && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Último uso:</span>
            <span className="font-medium text-slate-900">
              {new Date(agent.last_used_at).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {agent.status === 'deploying' && (
          <button
            disabled
            className="w-full flex items-center justify-center space-x-2 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-2 rounded-lg font-medium"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Desplegando...</span>
          </button>
        )}

        {agent.status !== 'active' && agent.status !== 'deploying' && (
          <button
            onClick={handleDeploy}
            disabled={deploying}
            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white px-4 py-2 rounded-lg font-semibold transition-all disabled:opacity-50"
          >
            {deploying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Desplegando...</span>
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4" />
                <span>Desplegar Agente</span>
              </>
            )}
          </button>
        )}

        {agent.status === 'active' && (
          <button
            onClick={() => setShowTester(true)}
            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white px-4 py-2 rounded-lg font-semibold transition-all"
          >
            <Play className="w-4 h-4" />
            <span>Probar Agente</span>
          </button>
        )}

        <div className="flex space-x-2">
          <button className="flex-1 flex items-center justify-center space-x-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium transition-all">
            <BarChart3 className="w-4 h-4" />
            <span>Estadísticas</span>
          </button>
          {agent.worker_url && (
            <a
              href={agent.worker_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center bg-cyan-50 hover:bg-cyan-100 text-cyan-600 px-4 py-2 rounded-lg transition-all"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Confirmar Eliminación</h3>
            <p className="text-slate-600 mb-6">
              ¿Estás seguro de eliminar el agente "{agent.name}"? Esta acción no se puede deshacer.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-all"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {showTester && <AgentTester agent={agent} onClose={() => setShowTester(false)} />}
    </div>
  );
}
