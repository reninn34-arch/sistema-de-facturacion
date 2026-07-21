import React, { useState, useEffect } from 'react';
import {
  ShieldExclamationIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  GlobeAltIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  UserIcon,
  SignalIcon,
} from '@heroicons/react/24/outline';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

interface SessionData {
  id: string;
  userId: string;
  businessId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  deviceName: string | null;
  browser: string | null;
  location: string | null;
  loginAt: string;
  status: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
}

interface SessionsPageProps {
  currentUser: any;
  onNotify: (text: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

const SessionsPage: React.FC<SessionsPageProps> = ({ currentUser, onNotify }) => {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPERADMIN';

  const loadSessions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/business/sessions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Error al cargar sesiones');
      }

      const data = await response.json();
      setSessions(data.sessions || []);
      setCurrentSessionId(data.currentSessionId || null);
    } catch (error: any) {
      onNotify(error.message || 'Error al cargar sesiones', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();

    // Refrescar tabla solo por eventos reales (cero polling)
    const onVisible = () => { if (document.visibilityState === 'visible') loadSessions(); };
    document.addEventListener('visibilitychange', onVisible);

    // Otra pestaña del mismo navegador revocó una sesión → refrescar
    const onStorage = (e: StorageEvent) => { if (e.key === 'sessionRevoked') loadSessions(); };
    window.addEventListener('storage', onStorage);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const executeRevoke = async (sessionId: string) => {
    // Optimistic update: marcar como inactiva al instante
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: 'REVOKED' } : s));

    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/business/sessions/${sessionId}/revoke`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (!response.ok) {
        // Revertir si falló
        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: 'ACTIVE' } : s));
        throw new Error(data.message || 'Error al revocar sesión');
      }

      onNotify('Sesión cerrada correctamente', 'success');
      // Notificar a otras pestañas del mismo navegador que refresquen la tabla
      localStorage.setItem('sessionRevoked', Date.now().toString());
    } catch (error: any) {
      onNotify(error.message || 'Error al revocar sesión', 'error');
    }
  };

  const handleRevoke = (sessionId: string) => {
    setConfirmModal({
      show: true,
      title: 'Cerrar Sesión Activa',
      message: '¿Estás seguro de cerrar esta sesión? El usuario será desconectado de ese dispositivo.',
      onConfirm: () => {
        executeRevoke(sessionId);
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  };

  const executeRevokeAll = async () => {
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/business/sessions/revoke-others`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        onNotify(data.message || 'Demás sesiones revocadas exitosamente', 'success');
        localStorage.setItem('sessionRevoked', Date.now().toString());
        loadSessions();
      } else {
        throw new Error(data.error || data.message || 'Error al revocar demás sesiones');
      }
    } catch (err: any) {
      onNotify(err.message || 'Error al revocar demás sesiones', 'error');
    }
  };

  const handleRevokeAll = () => {
    setConfirmModal({
      show: true,
      title: 'Cerrar Todas las Demás Sesiones',
      message: '¿Cerrar todas las demás sesiones? Esto desconectará a los usuarios de todos los demás dispositivos.',
      onConfirm: () => {
        executeRevokeAll();
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
  };

  const activeSessions = sessions.filter(s => s.status === 'ACTIVE');
  const otherActiveSessions = activeSessions.filter(s => s.id !== currentSessionId);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm dark:shadow-lg dark:shadow-black/10 border border-slate-100 dark:border-slate-700/50">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter flex items-center gap-3">
              <ShieldExclamationIcon className="w-8 h-8 text-indigo-500" />
              Seguridad / Dispositivos
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {isAdmin
                ? 'Monitorea las sesiones activas de tu equipo y cierra accesos no autorizados.'
                : 'Revisa los dispositivos desde los que has iniciado sesión.'}
            </p>
          </div>
          <div className="flex gap-3">
            <button type="submit"
              onClick={loadSessions}
              className="px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-2"
            >
              <ArrowPathIcon className="w-4 h-4" /> Actualizar
            </button>
            {otherActiveSessions.length > 0 && (
              <button type="button"
                onClick={handleRevokeAll}
                className="px-4 py-3 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 flex items-center gap-2"
              >
                <XCircleIcon className="w-4 h-4" /> Cerrar todas ({otherActiveSessions.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <SignalIcon className="w-4 h-4 text-emerald-500" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Activas</span>
          </div>
          <p className="text-2xl font-black text-slate-800 dark:text-white">{activeSessions.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <UserIcon className="w-4 h-4 text-sky-500" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuarios</span>
          </div>
          <p className="text-2xl font-black text-slate-800 dark:text-white">
            {new Set(activeSessions.map(s => s.userId)).size}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <XCircleIcon className="w-4 h-4 text-slate-400" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revocadas</span>
          </div>
          <p className="text-2xl font-black text-slate-800 dark:text-white">
            {sessions.filter(s => s.status !== 'ACTIVE').length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <GlobeAltIcon className="w-4 h-4 text-purple-500" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">IPs Únicas</span>
          </div>
          <p className="text-2xl font-black text-slate-800 dark:text-white">
            {(() => {
              const uniqueIps = new Set<string>();
              for (const s of sessions) {
                if (s.status === 'ACTIVE' && s.ipAddress) {
                  uniqueIps.add(s.ipAddress);
                }
              }
              return uniqueIps.size;
            })()}
          </p>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm dark:shadow-lg dark:shadow-black/10 border border-slate-100 dark:border-slate-700/50 overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400 dark:text-slate-500">
            <ClockIcon className="w-12 h-12 mx-auto mb-4 animate-pulse" />
            <p className="font-bold">Cargando sesiones...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-16 text-center text-slate-400 dark:text-slate-500">
            <ComputerDesktopIcon className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="font-bold">No se encontraron sesiones</p>
            <p className="text-xs mt-2">Las sesiones se registran al iniciar sesión.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700/50">
                  <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Dispositivo</th>
                  {isAdmin && (
                    <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Usuario</th>
                  )}
                  <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Navegador</th>
                  <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Ubicación</th>
                  <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">IP</th>
                  <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Fecha de Inicio</th>
                  <th className="text-left px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Estado</th>
                  <th className="text-right px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {sessions.map((session) => {
                  const isCurrent = session.id === currentSessionId;
                  const isMobile = session.deviceName?.toLowerCase().includes('iphone') ||
                    session.deviceName?.toLowerCase().includes('android');

                  return (
                    <tr
                      key={session.id}
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${
                        isCurrent ? 'bg-indigo-50/30 dark:bg-indigo-500/5' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            isCurrent
                              ? 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-500'
                              : 'bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400'
                          }`}>
                            {isMobile
                              ? <DevicePhoneMobileIcon className="w-5 h-5" />
                              : <ComputerDesktopIcon className="w-5 h-5" />
                            }
                          </div>
                          <div>
                            <p className="font-bold text-sm text-slate-800 dark:text-white">
                              {session.deviceName || 'Desconocido'}
                              {isCurrent && (
                                <span className="ml-2 text-[9px] bg-indigo-100 dark:bg-indigo-500/20 text-indigo-500 dark:text-indigo-400 px-2 py-0.5 rounded-full font-black">
                                  ACTUAL
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-bold text-sm text-slate-800 dark:text-white">
                              {session.user.name || session.user.email}
                            </p>
                            <p className="text-xs text-slate-400">{session.user.role}</p>
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {session.browser || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <GlobeAltIcon className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {session.location || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono text-slate-500 dark:text-slate-400">
                          {session.ipAddress || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {formatDate(session.loginAt)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          const statusColors: Record<string, string> = {
                            'ACTIVE': 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                            'INACTIVE': 'bg-slate-100 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500',
                            'REVOKED': 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400',
                          };
                          const statusDot: Record<string, string> = {
                            'ACTIVE': 'bg-emerald-500',
                            'INACTIVE': 'bg-slate-400',
                            'REVOKED': 'bg-red-500',
                          };
                          const statusLabel: Record<string, string> = {
                            'ACTIVE': 'ACTIVA',
                            'INACTIVE': 'INACTIVA',
                            'REVOKED': 'REVOCADA',
                          };
                          return (
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black ${statusColors[session.status] || 'bg-slate-100 text-slate-400'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusDot[session.status] || 'bg-slate-400'}`}></span>
                              {statusLabel[session.status] || session.status}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end">
                          {session.status === 'ACTIVE' && !isCurrent && (
                            <button type="button"
                              onClick={() => handleRevoke(session.id)}
                              className="px-4 py-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl font-bold text-xs hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors flex items-center gap-1"
                            >
                              <XCircleIcon className="w-3 h-3" />
                              Cerrar sesión
                            </button>
                          )}
                          {isCurrent && (
                            <span className="text-xs text-slate-400 italic">Sesión actual</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirmModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] max-w-md w-full p-8 border border-slate-100 dark:border-slate-700/50 shadow-2xl animate-scale-in">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center text-amber-500 flex-shrink-0">
                <ExclamationTriangleIcon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight uppercase">
                  {confirmModal.title}
                </h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                  {confirmModal.message}
                </p>
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-sm font-bold text-white transition-all shadow-md hover:shadow-lg shadow-red-500/20 uppercase tracking-wider"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionsPage;
