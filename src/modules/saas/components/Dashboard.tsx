
import React, { useState, useEffect } from 'react';
import { getBusinessInsights } from '../../../services/geminiService';
import { Document, Product, DocumentType, SriStatus } from '../../../types/types';
import { client } from '../../../api/client';

interface SubscriptionStats {
  totalBusinesses: number;
  activeBusinesses: number;
  expiredBusinesses: number;
  expiringBusinesses: number;
  planDistribution: { plan: string; count: number }[];
  totalUsers: number;
  usersByRole: { role: string; count: number }[];
  recentBusinesses: any[];
  monthlyRevenue: number;
}

interface BusinessInfo {
  id?: string | number;
  name?: string;
  plan?: string;
  subscriptionEnd?: string | Date | null;
  isActive?: boolean;
  [key: string]: any;
}

interface DashboardProps {
  documents: Document[];
  products: Product[];
  setActiveTab: (tab: string) => void;
  currentUser?: any;
  isLoading?: boolean;
  businessInfo?: BusinessInfo;
}

const Dashboard: React.FC<DashboardProps> = ({ documents, products, setActiveTab, currentUser, businessInfo }) => {
  const [insights, setInsights] = useState<string>("Generando auditoría IA...");
  const [subscriptionStats, setSubscriptionStats] = useState<SubscriptionStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const isSuperAdmin = currentUser?.role === 'SUPERADMIN';
  const isAdmin = currentUser?.role === 'ADMIN';

  // Calcular días restantes de suscripción para ADMIN
  const subscriptionDaysRemaining = React.useMemo(() => {
    if (!businessInfo?.subscriptionEnd || businessInfo.plan === 'UNLIMITED') return null;
    const end = new Date(businessInfo.subscriptionEnd);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [businessInfo?.subscriptionEnd, businessInfo?.plan]);

  // Obtener color según días restantes
  const subscriptionStatusColor = React.useMemo(() => {
    if (subscriptionDaysRemaining === null) return 'emerald';
    if (subscriptionDaysRemaining < 0) return 'red';
    if (subscriptionDaysRemaining < 30) return 'red';
    if (subscriptionDaysRemaining < 90) return 'amber';
    return 'emerald';
  }, [subscriptionDaysRemaining]);

  // Obtener etiqueta del plan
  const getPlanLabel = (plan: string | undefined) => {
    const labels: Record<string, string> = {
      FREE: 'Gratis',
      BASIC: 'Básico',
      PRO: 'Profesional',
      ENTERPRISE: 'Empresarial',
      MONTHLY: 'Mensual',
      SEMIANNUAL: 'Semestral',
      YEARLY: 'Anual',
      UNLIMITED: 'Ilimitado',
      PENDING: 'Pendiente'
    };
    return labels[plan || ''] || plan || 'Básico';
  };

  // Safe array operations
  const safeDocuments = Array.isArray(documents) ? documents : [];
  const safeProducts = Array.isArray(products) ? products : [];

  const totalSales = safeDocuments
    .filter((d: any) => d.type === DocumentType.INVOICE && d.status === SriStatus.AUTHORIZED)
    .reduce((acc: number, d: any) => acc + (d.total || 0), 0);

  const lowStock = safeProducts.filter((p: any) => (p.stock || 0) < (p.minStock || 0) && (p.minStock || 0) > 0);

  // Cargar estadísticas de suscripciones para SUPERADMIN
  useEffect(() => {
    if (!isSuperAdmin) return;
    
    const loadStats = async () => {
      setLoadingStats(true);
      try {
        const response = await client.get<any>('/api/admin/subscription-stats');
        console.log('📊 [Dashboard] Stats response.data:', response.data);
        setSubscriptionStats(response.data);
      } catch (error: any) {
        console.error('❌ [Dashboard] Error:', error.message);
        if (error.response) {
          console.error('❌ [Dashboard] Status:', error.response.status);
        }
        setSubscriptionStats({
          totalBusinesses: 0,
          activeBusinesses: 0,
          expiredBusinesses: 0,
          expiringBusinesses: 0,
          planDistribution: [],
          totalUsers: 0,
          usersByRole: [],
          recentBusinesses: [],
          monthlyRevenue: 0
        });
      } finally {
        setLoadingStats(false);
      }
    };
    loadStats();
  }, [isSuperAdmin]);

  useEffect(() => {
    if (isSuperAdmin) return; // No generar insights IA para superadmin
    const fetchInsights = async () => {
      const dataForAI = {
        totalVentas: totalSales,
        inventario: products.map(p => ({ n: p.description, s: p.stock })),
        documentos: documents.length
      };
      const result = await getBusinessInsights(dataForAI);
      setInsights(result || "Error al generar.");
    };
    fetchInsights();
  }, [totalSales, products.length, isSuperAdmin]);

  // =============================================
  // DASHBOARD SUPERADMIN - Ventas de Suscripciones
  // =============================================
  if (isSuperAdmin) {
    const planColors: Record<string, string> = {
      FREE: 'slate',
      BASIC: 'blue',
      PRO: 'purple',
      ENTERPRISE: 'emerald',
      MONTHLY: 'cyan',
      SEMIANNUAL: 'orange',
      YEARLY: 'indigo',
      UNLIMITED: 'rose',
      PENDING: 'gray'
    };

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* KPIs Principales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { 
              label: 'Ingresos Mensuales', 
              value: `$${(subscriptionStats?.monthlyRevenue || 0).toFixed(2)}`, 
              sub: 'Estimado por suscripciones', 
              color: 'emerald', 
              icon: '💰',
              action: () => setActiveTab('admin-users') 
            },
            { 
              label: 'Empresas Activas', 
              value: `${subscriptionStats?.activeBusinesses || 0}/${subscriptionStats?.totalBusinesses || 0}`, 
              sub: 'Total registradas', 
              color: 'blue', 
              icon: '🏢',
              action: () => setActiveTab('admin-users') 
            },
            { 
              label: 'Por Vencer', 
              value: (subscriptionStats?.expiringBusinesses || 0).toString(), 
              sub: 'Próximos 30 días', 
              color: 'amber', 
              icon: '⚠️',
              action: () => setActiveTab('admin-users') 
            },
            { 
              label: 'Usuarios Totales', 
              value: (subscriptionStats?.totalUsers || 0).toString(), 
              sub: 'En el sistema', 
              color: 'indigo', 
              icon: '👥',
              action: () => setActiveTab('user-management') 
            },
          ].map((stat, i) => (
            <div
              key={i}
              onClick={stat.action}
              className="bg-white dark:bg-[#1e293b] p-8 rounded-[2rem] shadow-sm dark:shadow-lg dark:shadow-black/10 border border-slate-100 dark:border-slate-700/50 flex flex-col justify-between cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">{stat.label}</span>
                <span className="text-2xl">{stat.icon}</span>
              </div>
              <div className="mt-4">
                <span className={`text-3xl font-black ${
                  stat.color === 'amber' && (subscriptionStats?.expiringBusinesses || 0) > 0 
                    ? 'text-amber-600 dark:text-amber-400' 
                    : stat.color === 'emerald' 
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-800 dark:text-white'
                }`}>
                  {loadingStats ? '...' : stat.value}
                </span>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase">{stat.sub}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Distribución por Plan */}
          <div className="lg:col-span-2 bg-white dark:bg-[#1e293b] p-8 rounded-[2rem] shadow-sm dark:shadow-lg dark:shadow-black/10 border border-slate-100 dark:border-slate-700/50">
            <h3 className="font-black text-slate-800 dark:text-white mb-6 uppercase tracking-tighter flex items-center gap-2">
              <span className="text-blue-500">📊</span> Distribución de Suscripciones
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {(subscriptionStats?.planDistribution || []).map((plan, i) => {
                const color = planColors[plan.plan] || 'slate';
                const planPrices: Record<string, number> = { FREE: 0, BASIC: 29.99, PRO: 59.99, ENTERPRISE: 99.99, MONTHLY: 29.99, SEMIANNUAL: 49.99, YEARLY: 99.99, UNLIMITED: 199.99, PENDING: 0 };
                const revenue = (planPrices[plan.plan] || 0) * plan.count;
                return (
                  <div key={i} className={`p-5 rounded-2xl bg-${color}-50 dark:bg-${color}-500/10 border border-${color}-100 dark:border-${color}-500/20`}>
                    <p className={`text-[10px] font-black text-${color}-600 dark:text-${color}-400 uppercase mb-1`}>{plan.plan}</p>
                    <p className="text-2xl font-black text-slate-800 dark:text-white">{plan.count}</p>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1">${revenue.toFixed(2)}/mes</p>
                  </div>
                );
              })}
              {(!subscriptionStats?.planDistribution || subscriptionStats.planDistribution.length === 0) && (
                <div className="col-span-4 text-center py-8 text-slate-400 dark:text-slate-500">
                  {loadingStats ? 'Cargando...' : 'Sin datos de suscripciones'}
                </div>
              )}
            </div>

            {/* Usuarios por Rol */}
            <h4 className="font-black text-slate-600 dark:text-slate-300 mb-4 text-sm uppercase tracking-wider">Usuarios por Rol</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(subscriptionStats?.usersByRole || []).map((role, i) => {
                const roleLabels: Record<string, string> = {
                  SUPERADMIN: '🛡️ Superadmins',
                  ADMIN: '👔 Admins Empresa',
                  USER: '👤 Vendedores',
                  VENDEDOR: '🛒 Vendedores',
                  CONTADOR: '📊 Contadores'
                };
                return (
                  <div key={i} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">{roleLabels[role.role] || role.role}</p>
                    <p className="text-xl font-black text-slate-800 dark:text-white">{role.count}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Empresas Recientes */}
          <div className="bg-slate-900 dark:bg-[#0f172a] p-8 rounded-[2rem] shadow-2xl dark:shadow-black/30 text-white flex flex-col border border-transparent dark:border-slate-700/50">
            <h3 className="font-black mb-6 uppercase tracking-tighter text-blue-400 flex items-center gap-2">
              <span>🆕</span> Empresas Recientes
            </h3>
            <div className="space-y-4 flex-1 overflow-y-auto pr-2">
              {(subscriptionStats?.recentBusinesses || []).map((b, i) => (
                <div key={b.id || i} className="p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-sm truncate pr-2">{b.name}</h4>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${b.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {b.isActive ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span>RUC: {b.ruc}</span>
                    <span>•</span>
                    <span className="text-blue-400">{b.plan}</span>
                    <span>•</span>
                    <span>{b._count?.users || 0} usuarios</span>
                  </div>
                  <div className="mt-2 text-[10px] text-slate-500">
                    Vence: {b.subscriptionEnd ? new Date(b.subscriptionEnd).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              ))}
              {(!subscriptionStats?.recentBusinesses || subscriptionStats.recentBusinesses.length === 0) && (
                <div className="text-center py-8 text-slate-500">
                  {loadingStats ? 'Cargando...' : 'Sin empresas registradas'}
                </div>
              )}
            </div>
            <button
              onClick={() => setActiveTab('admin-users')}
              className="mt-6 w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
            >
              Ver Panel SaaS Completo
            </button>
          </div>
        </div>

        {/* Alertas de Suscripciones */}
        {(subscriptionStats?.expiredBusinesses || 0) > 0 && (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-4 sm:p-6 rounded-[1.5rem] lg:rounded-[2rem] flex items-center gap-3 sm:gap-4">
            <div className="w-10 sm:w-12 h-10 sm:h-12 bg-red-500 text-white rounded-2xl flex items-center justify-center text-xl sm:text-2xl flex-shrink-0 shadow-lg shadow-red-200 dark:shadow-red-500/20">
              🚨
            </div>
            <div className="flex-1">
              <p className="font-black text-red-800 dark:text-red-300 text-sm">
                {subscriptionStats?.expiredBusinesses} empresa(s) con suscripción expirada
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                Estas empresas podrían perder acceso al sistema. Revise el panel SaaS para gestionar sus suscripciones.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('admin-users')}
              className="px-6 py-3 bg-red-500 text-white rounded-xl font-bold text-xs hover:bg-red-600 transition-colors shadow-lg"
            >
              Gestionar
            </button>
          </div>
        )}
      </div>
    );
  }

  // =============================================
  // DASHBOARD NORMAL (ADMIN / USER)
  // =============================================
  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Panel de Suscripción para ADMIN (no SUPERADMIN) */}
      {isAdmin && businessInfo && businessInfo.plan !== 'UNLIMITED' && (
        <div className={`bg-gradient-to-r from-slate-900 to-slate-800 rounded-[2rem] p-6 text-white shadow-xl border border-slate-700/50`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${
                subscriptionStatusColor === 'emerald' ? 'bg-emerald-500/20' : 
                subscriptionStatusColor === 'amber' ? 'bg-amber-500/20' : 'bg-red-500/20'
              }`}>
                {subscriptionDaysRemaining === null ? '♾️' : subscriptionDaysRemaining < 0 ? '⚠️' : '📅'}
              </div>
              <div>
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Suscripción</div>
                <div className="text-xl font-black">
                  {subscriptionDaysRemaining === null ? (
                    'Ilimitado'
                  ) : subscriptionDaysRemaining < 0 ? (
                    <span className="text-red-400">Vencida hace {Math.abs(subscriptionDaysRemaining)} días</span>
                  ) : (
                    `${subscriptionDaysRemaining} días restantes`
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Plan: {getPlanLabel(businessInfo.plan)} • Vence: {businessInfo.subscriptionEnd ? new Date(businessInfo.subscriptionEnd).toLocaleDateString() : 'N/A'}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              {/* Barra de progreso */}
              <div className="hidden md:block w-48">
                <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      subscriptionStatusColor === 'emerald' ? 'bg-emerald-500' : 
                      subscriptionStatusColor === 'amber' ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: subscriptionDaysRemaining === null ? '100%' : `${Math.min(Math.max((subscriptionDaysRemaining / 90) * 100, 0), 100)}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-400 mt-1 text-center">Tiempo restante</div>
              </div>
              <button
                onClick={() => setActiveTab('pago-interno')}
                className={`px-6 py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all shadow-lg ${
                  subscriptionStatusColor === 'red' 
                    ? 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/30' : 
                    subscriptionStatusColor === 'amber'
                    ? 'bg-amber-500 hover:bg-amber-400 text-white shadow-amber-500/30'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
                }`}
              >
                {subscriptionDaysRemaining !== null && subscriptionDaysRemaining < 30 ? 'Renovar' : 'Gestionar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel de Suscripción para ADMIN con plan ILIMITADO */}
      {isAdmin && businessInfo && businessInfo.plan === 'UNLIMITED' && (
        <div className="bg-gradient-to-r from-emerald-900 to-slate-900 rounded-[2rem] p-6 text-white shadow-xl border border-emerald-500/30">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl bg-emerald-500/20">
              ♾️
            </div>
            <div>
              <div className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-1">Suscripción Activa</div>
              <div className="text-xl font-black text-emerald-400">Plan Ilimitado</div>
              <div className="text-xs text-slate-400 mt-1">
                Disfruta de todas las funcionalidades sin límites
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Ventas Reales', value: `${totalSales.toFixed(2)}`, sub: 'Hoy', color: 'blue', action: () => setActiveTab('reports') },
          { label: 'Alertas Inventario', value: lowStock.length.toString(), sub: 'Items bajos', color: 'rose', action: () => setActiveTab('products') },
          { label: 'Emitidos Hoy', value: documents.length.toString(), sub: 'Doc. SRI', color: 'emerald', action: () => setActiveTab('reports') },
          { label: 'IVA Neto', value: `${(totalSales * 0.15).toFixed(2)}`, sub: 'Estimado', color: 'indigo', action: () => setActiveTab('reports') },
        ].map((stat, i) => (
          <div
            key={i}
            onClick={stat.action}
            className="bg-white dark:bg-[#1e293b] p-8 rounded-[2rem] shadow-sm dark:shadow-lg dark:shadow-black/10 border border-slate-100 dark:border-slate-700/50 flex flex-col justify-between cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all group"
          >
            <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">{stat.label}</span>
            <div className="mt-4">
              <span className={`text-3xl font-black ${stat.color === 'rose' && lowStock.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-white'}`}>
                {stat.value}
              </span>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase">{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-[#1e293b] p-5 sm:p-6 lg:p-8 rounded-[1.5rem] lg:rounded-[2rem] shadow-sm dark:shadow-lg dark:shadow-black/10 border border-slate-100 dark:border-slate-700/50 min-h-[300px] sm:min-h-[400px]">
          <h3 className="font-black text-slate-800 dark:text-white mb-4 sm:mb-8 uppercase tracking-tighter text-sm sm:text-lg">Auditoría en Tiempo Real</h3>
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 sm:p-6 rounded-3xl border border-slate-100 dark:border-slate-700/50 flex items-start gap-3 sm:gap-4">
            <div className="w-10 sm:w-12 h-10 sm:h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-xl sm:text-2xl flex-shrink-0 shadow-lg shadow-blue-200 dark:shadow-blue-500/20 animate-pulse">🤖</div>
            <div className="flex-1">
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 font-medium italic">"{insights}"</p>
            </div>
          </div>
          
          <div className="mt-8 grid grid-cols-2 gap-4">
             <div onClick={() => setActiveTab('products')} className="p-6 rounded-3xl bg-blue-50/50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/20 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-500/10 transition-colors">
                <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase mb-2">Top Producto</p>
                <p className="font-black text-slate-800 dark:text-white">Licencia Cloud Pro</p>
             </div>
             <div onClick={() => setActiveTab('config')} className="p-6 rounded-3xl bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/20 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-500/10 transition-colors">
                <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase mb-2">Próximo Vencimiento</p>
                <p className="font-black text-slate-800 dark:text-white">Firma Electrónica: 28 Jul</p>
             </div>
          </div>
        </div>

        <div className="bg-slate-900 dark:bg-[#0f172a] p-5 sm:p-6 lg:p-8 rounded-[1.5rem] lg:rounded-[2rem] shadow-2xl dark:shadow-black/30 text-white flex flex-col border border-transparent dark:border-slate-700/50">
          <h3 className="font-black mb-4 sm:mb-6 uppercase tracking-tighter text-blue-400 text-sm sm:text-base">Estado de Inventario</h3>
          <div className="space-y-6 flex-1 overflow-y-auto pr-2">
            {products.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p className="text-lg mb-2">📦</p>
                <p className="text-sm">No hay productos registrados</p>
                <button
                  onClick={() => setActiveTab('products')}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-bold transition-colors"
                >
                  Agregar Productos
                </button>
              </div>
            ) : (
              products.slice(0, 10).map(p => (
                <div key={p.id} className="flex flex-col gap-2">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-wider gap-2">
                    <span className="truncate w-20 sm:w-40">{p.description}</span>
                    <span className={p.stock < p.minStock ? 'text-rose-400' : 'text-blue-400'}>{p.stock} un.</span>
                  </div>
                  <div className="h-2 bg-slate-800 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ${p.stock < p.minStock ? 'bg-rose-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min((p.stock / 100) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))
            )}
          </div>
          <button
            onClick={() => setActiveTab('products')}
            className="mt-6 sm:mt-8 w-full py-3 sm:py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-black text-xs uppercase tracking-widest transition-all min-h-[48px]"
          >
            {products.length > 0 ? 'Ver Inventario Completo' : 'Agregar Productos'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
