import { useState } from 'react';
import { ShieldCheck, Lock, Mail, X } from 'lucide-react';

interface AdminAccessModalProps {
  isOpen: boolean;
  email?: string;
  onClose: () => void;
  onVerified: () => void;
}

export function AdminAccessModal({ isOpen, email, onClose, onVerified }: AdminAccessModalProps) {
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const normalizedEmail = (email || '').trim().toLowerCase();
    const normalizedConfirmation = confirmationEmail.trim().toLowerCase();

    if (!normalizedEmail || normalizedConfirmation !== normalizedEmail) {
      setError('Debes confirmar el correo del superadministrador.');
      return;
    }

    if (passphrase.trim().toLowerCase() !== 'admin-ready') {
      setError('Código administrativo incorrecto. Usa el token acordado con seguridad.');
      return;
    }

    onVerified();
    setConfirmationEmail('');
    setPassphrase('');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-6 border border-slate-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-cyan-600 font-semibold">Reautenticación requerida</p>
              <h3 className="text-xl font-bold text-slate-900">Habilitar Panel Administrativo</h3>
              <p className="text-sm text-slate-600">Confirma identidad y token fuera de banda antes de acceder a controles sensibles.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleVerify}>
          <div>
            <label className="flex items-center text-sm font-semibold text-slate-700 mb-1">
              <Mail className="w-4 h-4 mr-2" /> Confirma el correo administrador
            </label>
            <input
              type="email"
              value={confirmationEmail}
              onChange={(e) => setConfirmationEmail(e.target.value)}
              placeholder="admin@tuempresa.com"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="flex items-center text-sm font-semibold text-slate-700 mb-1">
              <Lock className="w-4 h-4 mr-2" /> Token de operación crítica
            </label>
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Introduce el token seguro"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <p className="text-xs text-slate-500 mt-1">Solo personal autorizado conoce el código de sesión administrativa.</p>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-2">{error}</p>}

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-slate-500">
              <p>El acceso queda registrado en el historial de auditoría.</p>
            </div>
            <div className="space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold shadow-sm hover:from-cyan-400 hover:to-blue-400"
              >
                Validar y abrir
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
