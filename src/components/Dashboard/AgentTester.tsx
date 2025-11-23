import { useState } from 'react';
import { X, Send, Bot, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Agent } from '../../lib/supabase';

interface AgentTesterProps {
  agent: Agent;
  onClose: () => void;
}

export function AgentTester({ agent, onClose }: AgentTesterProps) {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [tokensUsed, setTokensUsed] = useState<number>(0);

  const handleTest = async () => {
    if (!query.trim() || !agent.worker_url) return;

    setLoading(true);
    setError('');
    setResponse('');

    try {
      const res = await fetch(agent.worker_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: query.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to get response');
      }

      setResponse(data.answer);
      setTokensUsed(data.tokens || 0);
    } catch (err: any) {
      setError(err.message || 'Error testing agent');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTest();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-cyan-500 to-blue-500">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Probar Agente</h2>
              <p className="text-cyan-100 text-sm">{agent.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!agent.worker_url ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
              <p className="text-slate-600 mb-4">
                Este agente aún no ha sido desplegado. Debes desplegarlo primero.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Pregunta para el agente
                </label>
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Escribe tu pregunta aquí..."
                  rows={4}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none resize-none"
                  disabled={loading}
                />
                <p className="text-xs text-slate-500 mt-2">
                  Presiona Enter para enviar o Shift+Enter para nueva línea
                </p>
              </div>

              <button
                onClick={handleTest}
                disabled={loading || !query.trim()}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Enviar Pregunta</span>
                  </>
                )}
              </button>

              {error && (
                <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-900">Error</p>
                      <p className="text-sm text-red-700 mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {response && (
                <div className="mt-6 space-y-4">
                  <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-lg p-6">
                    <div className="flex items-center space-x-2 mb-3">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <h3 className="font-semibold text-slate-900">Respuesta del Agente</h3>
                    </div>
                    <div className="prose prose-slate max-w-none">
                      <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {response}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-slate-100 rounded-lg px-4 py-3">
                    <div className="flex items-center space-x-4 text-sm text-slate-600">
                      <div>
                        <span className="font-medium">Modelo:</span> {agent.model}
                      </div>
                      <div>
                        <span className="font-medium">Tokens:</span> {tokensUsed}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <p className="text-xs text-slate-500 text-center">
            Esta es una prueba en tiempo real. El uso se registrará en tus estadísticas.
          </p>
        </div>
      </div>
    </div>
  );
}
