import { useState } from 'react';
import { X, ArrowRight, ArrowLeft, Upload, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, PLAN_LIMITS } from '../../lib/supabase';

interface CreateAgentWizardProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateAgentWizard({ onClose, onSuccess }: CreateAgentWizardProps) {
  const { profile } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    model: 'gpt-3.5-turbo',
    businessType: '',
    knowledgeBase: {
      faq: [] as Array<{ question: string; answer: string }>,
      context: '',
    },
    documents: [] as File[],
  });

  const availableModels = PLAN_LIMITS[profile?.plan_type || 'free'].models;

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleAddFaq = () => {
    setFormData({
      ...formData,
      knowledgeBase: {
        ...formData.knowledgeBase,
        faq: [...formData.knowledgeBase.faq, { question: '', answer: '' }],
      },
    });
  };

  const handleUpdateFaq = (index: number, field: 'question' | 'answer', value: string) => {
    const newFaq = [...formData.knowledgeBase.faq];
    newFaq[index][field] = value;
    setFormData({
      ...formData,
      knowledgeBase: {
        ...formData.knowledgeBase,
        faq: newFaq,
      },
    });
  };

  const handleRemoveFaq = (index: number) => {
    const newFaq = formData.knowledgeBase.faq.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      knowledgeBase: {
        ...formData.knowledgeBase,
        faq: newFaq,
      },
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData({
        ...formData,
        documents: Array.from(e.target.files),
      });
    }
  };

  const handleSubmit = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('agents')
        .insert({
          user_id: profile.id,
          name: formData.name,
          description: formData.description,
          model: formData.model,
          knowledge_base: formData.knowledgeBase,
          documents: formData.documents.map(f => ({ name: f.name, size: f.size })),
          config: {
            businessType: formData.businessType,
          },
          status: 'deploying',
        })
        .select()
        .single();

      if (error) throw error;

      onSuccess();
    } catch (err) {
      console.error('Error creating agent:', err);
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.name.trim().length > 0;
      case 2:
        return formData.knowledgeBase.context.trim().length > 0;
      case 3:
        return true;
      case 4:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full my-8 shadow-2xl">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Crear Nuevo Agente</h2>
            <p className="text-slate-600 mt-1">Paso {step} de 4</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-slate-600" />
          </button>
        </div>

        <div className="flex mb-6 px-6 pt-6">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex-1">
              <div className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                    s <= step
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {s < step ? <Check className="w-5 h-5" /> : s}
                </div>
                {s < 4 && (
                  <div
                    className={`flex-1 h-1 mx-2 transition-all ${
                      s < step ? 'bg-gradient-to-r from-cyan-500 to-blue-500' : 'bg-slate-200'
                    }`}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 min-h-[400px]">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Información Básica</h3>
                <p className="text-slate-600">Dale un nombre y describe qué hará tu agente</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nombre del Agente *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                  placeholder="Ej: Asistente de Restaurante"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none resize-none"
                  placeholder="Describe brevemente qué tipo de consultas responderá tu agente..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tipo de Negocio
                </label>
                <select
                  value={formData.businessType}
                  onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                >
                  <option value="">Selecciona un tipo</option>
                  <option value="restaurant">Restaurante</option>
                  <option value="salon">Peluquería/Salón</option>
                  <option value="gym">Gimnasio</option>
                  <option value="retail">Comercio</option>
                  <option value="services">Servicios</option>
                  <option value="other">Otro</option>
                </select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Base de Conocimiento</h3>
                <p className="text-slate-600">Proporciona información que tu agente debe conocer</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Contexto General *
                </label>
                <textarea
                  value={formData.knowledgeBase.context}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      knowledgeBase: { ...formData.knowledgeBase, context: e.target.value },
                    })
                  }
                  rows={6}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none resize-none"
                  placeholder="Describe tu negocio, productos, servicios, horarios, políticas, etc."
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-slate-700">
                    Preguntas Frecuentes
                  </label>
                  <button
                    onClick={handleAddFaq}
                    className="text-sm text-cyan-600 hover:text-cyan-700 font-medium"
                  >
                    + Añadir Pregunta
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.knowledgeBase.faq.map((faq, index) => (
                    <div key={index} className="bg-slate-50 rounded-lg p-4 space-y-3">
                      <input
                        type="text"
                        value={faq.question}
                        onChange={(e) => handleUpdateFaq(index, 'question', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                        placeholder="Pregunta"
                      />
                      <textarea
                        value={faq.answer}
                        onChange={(e) => handleUpdateFaq(index, 'answer', e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none resize-none"
                        placeholder="Respuesta"
                      />
                      <button
                        onClick={() => handleRemoveFaq(index)}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Documentos (Opcional)</h3>
                <p className="text-slate-600">Sube documentos para mejorar el conocimiento del agente</p>
              </div>

              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-cyan-500 transition-colors">
                <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-700 font-medium mb-2">
                  Arrastra archivos aquí o haz clic para seleccionar
                </p>
                <p className="text-sm text-slate-500 mb-4">
                  PDF, TXT, DOCX hasta 10MB
                </p>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.txt,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="inline-block bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium cursor-pointer transition-all"
                >
                  Seleccionar Archivos
                </label>
              </div>

              {formData.documents.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">Archivos seleccionados:</p>
                  {formData.documents.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-slate-50 rounded-lg p-3"
                    >
                      <span className="text-sm text-slate-700">{file.name}</span>
                      <span className="text-xs text-slate-500">
                        {(file.size / 1024).toFixed(2)} KB
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Seleccionar Modelo IA</h3>
                <p className="text-slate-600">Elige el modelo que mejor se adapte a tus necesidades</p>
              </div>

              <div className="space-y-3">
                {availableModels.map((model) => (
                  <label
                    key={model}
                    className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.model === model
                        ? 'border-cyan-500 bg-cyan-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="model"
                      value={model}
                      checked={formData.model === model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      className="w-5 h-5 text-cyan-500 focus:ring-cyan-500"
                    />
                    <div className="ml-4 flex-1">
                      <p className="font-medium text-slate-900">{model}</p>
                      <p className="text-sm text-slate-600">
                        {model.includes('gpt-4') ? 'Alto rendimiento' : 'Rápido y eficiente'}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className="flex items-center space-x-2 px-4 py-2 hover:bg-slate-100 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Anterior</span>
          </button>

          {step < 4 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white px-6 py-2 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Siguiente</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white px-6 py-2 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{loading ? 'Creando...' : 'Crear Agente'}</span>
              <Check className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
