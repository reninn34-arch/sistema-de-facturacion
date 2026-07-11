import React, { useState } from 'react';
import { MagnifyingGlassIcon, CheckCircleIcon, ClockIcon, XCircleIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

interface ActivationStatus {
  found: boolean;
  message?: string;
  status?: string;
  plan?: string;
  businessName?: string;
  ruc?: string;
  subscriptionStatus?: string;
  isActive?: boolean;
  adminNotes?: string | null;
}

const statusBadge = (s?: string) => {
  if (!s) return null;
  const config: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
    PENDING: { bg: 'bg-amber-100', text: 'text-amber-700', icon: <ClockIcon className="w-4 h-4" />, label: 'Pendiente' },
    APPROVED: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: <CheckCircleIcon className="w-4 h-4" />, label: 'Aprobada' },
    REJECTED: { bg: 'bg-red-100', text: 'text-red-700', icon: <XCircleIcon className="w-4 h-4" />, label: 'Rechazada' },
    ACTIVE: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: <CheckCircleIcon className="w-4 h-4" />, label: 'Activo' },
    EXPIRED: { bg: 'bg-red-100', text: 'text-red-700', icon: <XCircleIcon className="w-4 h-4" />, label: 'Expirado' },
    SUSPENDED: { bg: 'bg-slate-100', text: 'text-slate-700', icon: <XCircleIcon className="w-4 h-4" />, label: 'Suspendido' },
  };
  const c = config[s] || { bg: 'bg-slate-100', text: 'text-slate-700', icon: <ClockIcon className="w-4 h-4" />, label: s };
  return (
    <span className={`${c.bg} ${c.text} px-3 py-1 rounded-full text-[10px] font-black uppercase inline-flex items-center gap-1`}>
      {c.icon}{c.label}
    </span>
  );
};

const ActivationStatusLookup: React.FC = () => {
  const [ruc, setRuc] = useState('');
  const [status, setStatus] = useState<ActivationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatus(null);
    if (ruc.length < 10) {
      setError('Ingrese un RUC valido.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/public/activation-status?ruc=${encodeURIComponent(ruc)}`);
      const data = await res.json();
      setStatus(data);
    } catch {
      setError('Error de conexion. Intente mas tarde.');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="w-full max-w-lg mx-auto" id="consulta-estado">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8">
        <h3 className="text-xl font-extrabold text-slate-900 text-center mb-2">
          Estado de tu Solicitud
        </h3>
        <p className="text-sm text-slate-500 text-center mb-6">
          Ingresa tu RUC para consultar el estado de tu activacion.
        </p>

        <form onSubmit={handleLookup} className="flex gap-3">
          <input
            type="text"
            value={ruc}
            onChange={(e) => setRuc(e.target.value.replace(/\D/g, '').slice(0, 13))}
            placeholder="Ej: 1790012345001"
            className="flex-1 px-4 py-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm font-medium"
            maxLength={13}
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600 transition-all disabled:opacity-60 flex items-center gap-2 text-sm"
          >
            {loading ? (
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            ) : (
              <MagnifyingGlassIcon className="w-4 h-4" />
            )}
            Consultar
          </button>
        </form>

        {error && (
          <p className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-xl font-medium">{error}</p>
        )}

        {status && status.found && (
          <div className="mt-6 bg-slate-50 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">{status.businessName}</span>
              {status.status && statusBadge(status.status)}
              {status.subscriptionStatus && statusBadge(status.subscriptionStatus)}
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block">RUC</span>
                <span className="font-bold text-slate-700">{status.ruc}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Plan</span>
                <span className="font-bold text-slate-700">{status.plan}</span>
              </div>
              {status.status === 'APPROVED' && status.isActive && (
                <div className="col-span-2">
                  <span className="text-slate-400 block">Cuenta</span>
                  <span className="font-bold text-emerald-600">Activada - Ya puede iniciar sesion</span>
                </div>
              )}
              {status.adminNotes && (
                <div className="col-span-2">
                  <span className="text-slate-400 block">Nota del administrador</span>
                  <span className="font-medium text-slate-600">{status.adminNotes}</span>
                </div>
              )}
            </div>
            {(status.status === 'APPROVED' || status.subscriptionStatus === 'ACTIVE') && (
              <a
                href="/login"
                className="block w-full text-center py-3 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600 transition-all text-sm mt-2"
              >
                Iniciar Sesion
              </a>
            )}
          </div>
        )}

        {status && !status.found && (
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
            <DocumentTextIcon className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-amber-700">{status.message}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivationStatusLookup;
