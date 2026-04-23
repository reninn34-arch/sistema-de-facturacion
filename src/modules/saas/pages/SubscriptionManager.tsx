import React, { useState, useEffect, useMemo, useCallback } from 'react';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

// Definimos interfaces locales para evitar errores de importación
interface Business {
  id: string | number;
  name: string;
  isActive: boolean;
  subscriptionEnd: string | Date | null;
  plan?: string;
  createdAt?: string | Date;
}

interface UserWithBusiness {
  id: string | number;
  email: string;
  role: string;
  businessId: string | number | null;
  business: Business | null;
}

interface SubscriptionHistoryItem {
  id: string;
  date: string;
  action: string;
  details: string;
  amount: string;
}

interface SubscriptionManagerProps {
  businessId: string | number | null;
  onNotify: (text: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({ businessId, onNotify }) => {
  const [users, setUsers] = useState<UserWithBusiness[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | number | null>(businessId);
  const [monthsInput, setMonthsInput] = useState<string>('1');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'manage' | 'history' | 'details'>('manage');
  const [history, setHistory] = useState<SubscriptionHistoryItem[]>([]);

  // Cargar usuarios directamente desde la API
  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) return;

      const response = await fetch(`${API_URL}/api/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Error al cargar lista de empresas');
      
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error(error);
      onNotify('Error al cargar datos de empresas', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Actualizar selección si cambia la prop (ej. al venir desde Usuarios)
  useEffect(() => {
    if (businessId) setSelectedBusinessId(businessId);
  }, [businessId]);

  // Extraer lista única de empresas desde los usuarios
  const businesses = useMemo(() => {
    return users
      .map(u => u.business)
      .filter((b): b is Business => !!b)
      .filter((b, index, self) => index === self.findIndex(t => t.id === b.id));
  }, [users]);

  // Comparación robusta convirtiendo ambos a String
  const selectedBusiness = useMemo(() => {
    return businesses.find(b => String(b.id) === String(selectedBusinessId));
  }, [businesses, selectedBusinessId]);

  // Calcular días restantes
  const daysRemaining = useMemo(() => {
    if (!selectedBusiness?.subscriptionEnd || selectedBusiness.plan === 'UNLIMITED') return null;
    const end = new Date(selectedBusiness.subscriptionEnd);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [selectedBusiness]);

  // Calcular porcentaje de tiempo consumido
  const timePercentage = useMemo(() => {
    if (!selectedBusiness?.subscriptionEnd || selectedBusiness.plan === 'UNLIMITED') return 100;
    const end = new Date(selectedBusiness.subscriptionEnd);
    const now = new Date();
    const created = selectedBusiness.createdAt ? new Date(selectedBusiness.createdAt) : new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    const total = end.getTime() - created.getTime();
    const elapsed = now.getTime() - created.getTime();
    if (total <= 0) return 100;
    const percentage = (elapsed / total) * 100;
    return Math.min(100, Math.max(0, percentage));
  }, [selectedBusiness]);

  // Obtener color según días restantes
  const statusColor = useMemo(() => {
    if (daysRemaining === null) return 'bg-emerald-500';
    if (daysRemaining < 0) return 'bg-red-500';
    if (daysRemaining < 30) return 'bg-red-500';
    if (daysRemaining < 90) return 'bg-yellow-500';
    return 'bg-emerald-500';
  }, [daysRemaining]);

  const handleUpdateSubscription = async (value: number | string) => {
    if (!selectedBusinessId) {
      onNotify('⚠️ Selecciona una empresa primero', 'warning');
      return;
    }
    
    const monthsToAdd = Number(value);
    if (isNaN(monthsToAdd)) {
      onNotify('❌ Por favor ingresa un número válido', 'warning');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/subscriptions/add-time`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ businessId: selectedBusinessId, months: monthsToAdd })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Error al actualizar');

      onNotify(data.message || `✅ Suscripción ${monthsToAdd > 0 ? 'extendida' : 'ajustada'} correctamente`, 'success');
      await loadData();
    } catch (error: any) {
      console.error(error);
      onNotify(error.message || '❌ Error al actualizar suscripción', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Planes disponibles
  const plans = [
    { id: 'BASIC', name: 'Básico', months: 1, price: 29, icon: '📦' },
    { id: 'PRO', name: 'Profesional', months: 1, price: 49, icon: '🚀' },
    { id: 'ENTERPRISE', name: 'Empresarial', months: 1, price: 99, icon: '🏢' },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-140px)] animate-in fade-in duration-500">
      {/* Sidebar: Lista de Empresas */}
      <div className="w-full md:w-1/3 bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="font-black text-slate-700 text-lg tracking-tight">🏢 Empresas</h3>
          <span className="text-xs font-bold text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-200">
            {businesses.length} Total
          </span>
        </div>
        <div className="overflow-y-auto flex-1 p-3 space-y-2 custom-scrollbar">
          {businesses.map(b => (
            <div
              key={b.id}
              onClick={() => setSelectedBusinessId(b.id)}
              className={`p-4 rounded-2xl cursor-pointer transition-all border-2 group ${
                String(selectedBusinessId) === String(b.id)
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-transparent hover:bg-slate-50 hover:border-slate-200'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1">{b.name}</h3>
                <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${
                  b.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                }`}>
                  {b.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 bg-white/50 px-2 py-1 rounded-lg">
                  {b.plan || 'Básico'}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {b.plan === 'UNLIMITED' ? '♾️ Indefinido' : b.subscriptionEnd ? new Date(b.subscriptionEnd).toLocaleDateString() : 'Sin fecha'}
                </span>
              </div>
              
              {/* Mini barra de progreso */}
              {b.plan !== 'UNLIMITED' && b.subscriptionEnd && (
                <div className="mt-2 h-1 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all ${statusColor}`}
                    style={{ width: `${100 - timePercentage}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content: Detalles y Acciones */}
      <div className="w-full md:w-2/3">
        {selectedBusiness ? (
          <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 h-full flex flex-col relative overflow-hidden">
            {/* Fondo decorativo */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50 pointer-events-none"></div>

            <div className="p-8 pb-0 relative z-10">
              <h2 className="text-3xl font-black text-slate-800 mb-1">{selectedBusiness.name}</h2>
              <p className="text-slate-400 font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Gestión de Suscripción
              </p>

              {/* Tabs */}
              <div className="flex gap-4 mt-6 border-b border-slate-100">
                <button 
                  onClick={() => setActiveTab('manage')}
                  className={`pb-3 text-sm font-bold transition-colors ${activeTab === 'manage' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  ⚡ Gestión Ágil
                </button>
                <button 
                  onClick={() => setActiveTab('details')}
                  className={`pb-3 text-sm font-bold transition-colors ${activeTab === 'details' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  📋 Detalles
                </button>
                <button 
                  onClick={() => setActiveTab('history')}
                  className={`pb-3 text-sm font-bold transition-colors ${activeTab === 'history' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  📜 Historial
                </button>
              </div>
            </div>

            {activeTab === 'manage' ? (
            <div className="p-8 flex-1 flex flex-col relative z-10">
              {/* Indicador Visual de Tiempo */}
              {selectedBusiness.plan !== 'UNLIMITED' && (
                <div className="mb-8 bg-gradient-to-r from-slate-900 to-slate-800 rounded-[2rem] p-6 text-white shadow-xl">
                  <div className="flex justify-between items-end mb-4">
                    <div>
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Tiempo Restante</div>
                      <div className="text-3xl font-black">
                        {daysRemaining !== null ? (
                          daysRemaining < 0 
                            ? `⚠️ Vencido por ${Math.abs(daysRemaining)} días`
                            : `${daysRemaining} días`
                        ) : '♾️ Indefinido'}
                      </div>
                    </div>
                    <div className={`text-right px-4 py-2 rounded-xl ${
                      selectedBusiness.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                    }`}>
                      <span className="font-black text-sm">{selectedBusiness.isActive ? '✅ ACTIVO' : '❌ SUSPENDIDO'}</span>
                    </div>
                  </div>
                  
                  {/* Barra de progreso */}
                  <div className="relative h-4 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className={`absolute left-0 top-0 h-full transition-all duration-500 ${statusColor}`}
                      style={{ width: `${100 - timePercentage}%` }}
                    />
                    {/* Marcas */}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-0.5 h-2 bg-slate-500"></div>
                    <div className="absolute right-1/4 top-1/2 -translate-y-1/2 w-0.5 h-2 bg-slate-500"></div>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 w-0.5 h-2 bg-slate-500"></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-bold">
                    <span>Nuevo</span>
                    <span>50%</span>
                    <span>25%</span>
                    <span>Ahora</span>
                  </div>
                </div>
              )}

              {/* Información del Plan */}
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Vencimiento Actual</div>
                  <div className="text-2xl font-black text-slate-700">
                    {selectedBusiness.plan === 'UNLIMITED' 
                      ? '♾️ Indefinido' 
                      : selectedBusiness.subscriptionEnd 
                        ? new Date(selectedBusiness.subscriptionEnd).toLocaleDateString(undefined, { dateStyle: 'long' }) 
                        : 'N/A'}
                  </div>
                </div>
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Plan Actual</div>
                  <div className="text-2xl font-black text-slate-700 flex items-center gap-2">
                    {selectedBusiness.plan === 'MONTHLY' ? '📅' : selectedBusiness.plan === 'SEMIANNUAL' ? '📆' : selectedBusiness.plan === 'YEARLY' ? '📊' : selectedBusiness.plan === 'PENDING' ? '⏳' : '📦'}
                    {selectedBusiness.plan === 'MONTHLY' ? 'Mensual' : selectedBusiness.plan === 'SEMIANNUAL' ? 'Semestral' : selectedBusiness.plan === 'YEARLY' ? 'Anual' : selectedBusiness.plan === 'PENDING' ? 'Pendiente' : selectedBusiness.plan || 'Mensual'}
                  </div>
                </div>
              </div>

              <div className="mt-auto bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-200 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-10 transition-opacity duration-500"></div>
                
                <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                  <span>🚀</span> Acciones Rápidas
                </h3>
                
                {selectedBusiness.plan === 'UNLIMITED' ? (
                  <div className="py-8 text-center">
                    <p className="text-slate-400 text-lg">♾️ Esta empresa cuenta con suscripción indefinida</p>
                    <p className="text-slate-500 text-sm mt-2">No es necesario gestionar el tiempo de suscripción.</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-3 mb-6">
                      <button onClick={() => handleUpdateSubscription(1)} disabled={loading} className="py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-sm transition-all">
                        +1 Mes
                      </button>
                      <button onClick={() => handleUpdateSubscription(3)} disabled={loading} className="py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-sm transition-all">
                        +3 Meses
                      </button>
                      <button onClick={() => handleUpdateSubscription(12)} disabled={loading} className="py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-sm transition-all">
                        +1 Año
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-end gap-4 pt-4 border-t border-white/10">
                      <div className="flex-1 w-full">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">Ajuste Manual (Meses)</label>
                        <div className="relative">
                          <input 
                            type="number" 
                            value={monthsInput}
                            onChange={(e) => setMonthsInput(e.target.value)}
                            className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white font-black text-lg focus:outline-none focus:bg-white/20 transition-all pl-4"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateSubscription(-1)}
                          disabled={loading}
                          className="px-4 py-3 bg-rose-500/30 hover:bg-rose-500/50 text-white rounded-xl font-bold transition-all"
                          title="Quitar 1 mes"
                        >
                          -1
                        </button>
                        <button
                          onClick={() => handleUpdateSubscription(monthsInput)}
                          disabled={loading}
                          className="flex-1 sm:flex-none px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/50 active:scale-95 text-xs"
                        >
                          {loading ? '⏳...' : 'Aplicar'}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            ) : activeTab === 'details' ? (
              <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Card: Información de la Empresa */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-[2rem] p-6 border border-blue-100">
                    <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                      <span>🏢</span> Información de la Empresa
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nombre</div>
                        <div className="font-bold text-slate-800">{selectedBusiness.name}</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">ID</div>
                        <div className="font-mono text-sm text-slate-600">{selectedBusiness.id}</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Plan</div>
                        <div className="font-bold text-blue-600">{selectedBusiness.plan === 'MONTHLY' ? 'Mensual' : selectedBusiness.plan === 'SEMIANNUAL' ? 'Semestral' : selectedBusiness.plan === 'YEARLY' ? 'Anual' : selectedBusiness.plan === 'PENDING' ? 'Pendiente' : selectedBusiness.plan || 'Mensual'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Card: Estado de Suscripción */}
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-[2rem] p-6 border border-emerald-100">
                    <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                      <span>📊</span> Estado de Suscripción
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Estado</div>
                        <div className={`font-bold ${selectedBusiness.isActive ? 'text-emerald-600' : 'text-red-600'}`}>
                          {selectedBusiness.isActive ? '✅ Activo' : '❌ Inactivo'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Vencimiento</div>
                        <div className="font-bold text-slate-800">
                          {selectedBusiness.plan === 'UNLIMITED' 
                            ? '♾️ Indefinido' 
                            : selectedBusiness.subscriptionEnd 
                              ? new Date(selectedBusiness.subscriptionEnd).toLocaleDateString() 
                              : 'No establecido'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Días Restantes</div>
                        <div className="font-bold text-slate-800">
                          {daysRemaining !== null ? daysRemaining : '♾️'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card: Historial de Tiempo */}
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-[2rem] p-6 border border-purple-100 md:col-span-2">
                    <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                      <span>📈</span> Resumen de Tiempo
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-white/50 rounded-2xl">
                        <div className="text-2xl font-black text-blue-600">
                          {daysRemaining !== null ? Math.max(0, daysRemaining) : '∞'}
                        </div>
                        <div className="text-xs font-bold text-slate-400 uppercase">Días Restantes</div>
                      </div>
                      <div className="text-center p-4 bg-white/50 rounded-2xl">
                        <div className="text-2xl font-black text-emerald-600">
                          {selectedBusiness.plan === 'UNLIMITED' ? '♾️' : daysRemaining !== null ? Math.ceil(daysRemaining / 30) : 0}
                        </div>
                        <div className="text-xs font-bold text-slate-400 uppercase">Meses Restantes</div>
                      </div>
                      <div className="text-center p-4 bg-white/50 rounded-2xl">
                        <div className="text-2xl font-black text-purple-600">
                          {selectedBusiness.plan === 'UNLIMITED' ? '♾️' : daysRemaining !== null ? Math.ceil(daysRemaining / 365) : 0}
                        </div>
                        <div className="text-xs font-bold text-slate-400 uppercase">Años Restantes</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-0 flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr>
                      <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                      <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">Acción</th>
                      <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">Detalle</th>
                      <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 text-sm font-bold text-slate-600">
                          {new Date(item.date).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-sm font-bold text-slate-800">{item.action}</td>
                        <td className="p-4 text-xs text-slate-500">{item.details}</td>
                        <td className="p-4 text-sm font-black text-slate-700 text-right">{item.amount}</td>
                      </tr>
                    ))}
                    {history.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-400 italic">No hay historial disponible</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 p-10 text-center">
            <span className="text-6xl mb-6 opacity-50">👈</span>
            <h3 className="text-xl font-bold text-slate-600 mb-2">Selecciona una empresa</h3>
            <p className="text-sm max-w-md">Haz clic en una empresa de la lista para gestionar su suscripción</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionManager;
