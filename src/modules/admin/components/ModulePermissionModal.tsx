import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

interface Module {
  id: string;
  code: string;
  name: string;
  description?: string;
  icon?: string;
}

interface UserModuleState extends Module {
  granted: boolean | null;
  inherited: boolean;
}

interface ModulePermissionModalProps {
  userId: string;
  userName: string;
  userEmail: string;
  onClose: () => void;
  onNotify: (text: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onSaved?: () => void;
}

const getModuleStatus = (mod: UserModuleState) => {
  if (mod.inherited) return { label: 'Por defecto', color: 'text-slate-400 bg-slate-100', icon: null };
  if (mod.granted) return { label: 'Activado', color: 'text-emerald-600 bg-emerald-100', icon: React.createElement(CheckCircleIcon, { className: "w-3 h-3" }) };
  return { label: 'Desactivado', color: 'text-red-600 bg-red-100', icon: React.createElement(XCircleIcon, { className: "w-3 h-3" }) };
};

const ModulePermissionModal: React.FC<ModulePermissionModalProps> = ({
  userId,
  userName,
  userEmail,
  onClose,
  onNotify,
  onSaved
}) => {
  const [modules, setModules] = useState<UserModuleState[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadModules();
  }, [userId]);

  const loadModules = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/business/users/${userId}/modules`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Error al cargar módulos');
      }

      const data = await response.json();
      setModules(data.modules || []);
    } catch (error: any) {
      onNotify(error.message || 'Error al cargar módulos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (moduleId: string) => {
    setModules(prev => prev.map(m => {
      if (m.id === moduleId) {
        // Si estaba heredado (null), activar por defecto
        if (m.granted === null) return { ...m, granted: true, inherited: false };
        // Si estaba granted=true, pasar a false
        if (m.granted === true) return { ...m, granted: false, inherited: false };
        // Si estaba granted=false, volver a heredado (null)
        return { ...m, granted: null, inherited: true };
      }
      return m;
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken');
      // Solo enviar los que tienen permiso explícito (no heredados)
      const permissions = modules
        .filter(m => m.granted !== null)
        .map(m => ({ moduleId: m.id, granted: m.granted }));

      const response = await fetch(`${API_URL}/api/business/users/${userId}/modules`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ permissions })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Error al guardar permisos');
      }

      onNotify('Permisos de módulo actualizados correctamente', 'success');
      if (onSaved) onSaved();
      onClose();
    } catch (error: any) {
      onNotify(error.message || 'Error al guardar permisos', 'error');
    } finally {
      setSaving(false);
    }
  };



  const activeCount = modules.filter(m => m.granted === true || (m.inherited && m.granted === null)).length;
  const totalCount = modules.length;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl dark:shadow-black/40 w-full max-w-2xl border border-slate-200 dark:border-slate-700/50 animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700/50 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-sky-500" /> Gestión de Módulos
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Usuario: <strong className="text-slate-800 dark:text-white">{userName || userEmail}</strong>
              </p>
            </div>
            <button aria-label="Cerrar" type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <span className="w-3 h-3 rounded-full bg-emerald-400"></span> Activado
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <span className="w-3 h-3 rounded-full bg-red-400"></span> Desactivado
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <span className="w-3 h-3 rounded-full bg-slate-300"></span> Por defecto
            </div>
            <span className="ml-auto text-xs font-bold text-slate-400">
              {activeCount}/{totalCount} activos
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8 text-slate-400">
              <SparklesIcon className="w-8 h-8 mx-auto mb-2 animate-pulse" />
              <p className="font-bold text-sm">Cargando módulos...</p>
            </div>
          ) : modules.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p className="font-bold text-sm">No hay módulos disponibles</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {modules.map(mod => {
                const status = getModuleStatus(mod);
                return (
                  <button type="button"
                    key={mod.id}
                    onClick={() => toggleModule(mod.id)}
                    className={`p-4 rounded-2xl border-2 transition-all text-left flex items-center justify-between gap-3 ${
                      mod.granted === true
                        ? 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-500/5 hover:bg-emerald-100 dark:hover:bg-emerald-500/10'
                        : mod.granted === false
                          ? 'border-red-300 bg-red-50/50 dark:bg-red-500/5 hover:bg-red-100 dark:hover:bg-red-500/10'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-sky-300 dark:hover:border-sky-600'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-800 dark:text-white truncate">{mod.name}</p>
                      {mod.description && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-2">{mod.description}</p>
                      )}
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black flex-shrink-0 ${status.color}`}>
                      {status.icon}
                      {status.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-700/50 flex-shrink-0 flex gap-3">
          <button type="button"
            onClick={() => loadModules()}
            disabled={loading}
            className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Restablecer
          </button>
          <button type="submit"
            onClick={handleSave}
            disabled={saving || loading}
            className="flex-1 py-3 bg-sky-500 text-white rounded-xl font-bold text-sm hover:bg-sky-600 transition-colors shadow-lg shadow-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModulePermissionModal;
