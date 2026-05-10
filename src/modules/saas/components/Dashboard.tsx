import React, { useState, useEffect } from 'react';
import { getBusinessInsights } from '../../../services/geminiService';
import { Document, Product, DocumentType, SriStatus } from '../../../types/types';
import { client } from '../../../api/client';
import { StatCard, Card, Skeleton, Badge } from '../../../components/ui';
import {
  BanknotesIcon,
  BuildingOffice2Icon,
  ExclamationTriangleIcon,
  UsersIcon,
  CubeIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  ShoppingCartIcon,
  BellAlertIcon,
  InboxIcon,
} from '@heroicons/react/24/outline';

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

const planColors: Record<string, string> = {
  FREE: 'slate',
  BASIC: 'indigo',
  PRO: 'purple',
  ENTERPRISE: 'emerald',
  MONTHLY: 'cyan',
  SEMIANNUAL: 'orange',
  YEARLY: 'indigo',
  UNLIMITED: 'rose',
  PENDING: 'gray'
};

const Dashboard: React.FC<DashboardProps> = ({ documents, products, setActiveTab, currentUser, businessInfo }) => {
  const [insights, setInsights] = useState<string>('');
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [subscriptionStats, setSubscriptionStats] = useState<SubscriptionStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const isSuperAdmin = currentUser?.role === 'SUPERADMIN';
  const isAdmin = currentUser?.role === 'ADMIN';

  const subscriptionDaysRemaining = React.useMemo(() => {
    if (!businessInfo?.subscriptionEnd || businessInfo.plan === 'UNLIMITED') return null;
    const end = new Date(businessInfo.subscriptionEnd);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [businessInfo?.subscriptionEnd, businessInfo?.plan]);

  const subscriptionStatusColor = React.useMemo(() => {
    if (subscriptionDaysRemaining === null) return 'emerald';
    if (subscriptionDaysRemaining < 0) return 'red';
    if (subscriptionDaysRemaining < 30) return 'red';
    if (subscriptionDaysRemaining < 90) return 'amber';
    return 'emerald';
  }, [subscriptionDaysRemaining]);

  const getPlanLabel = (plan: string | undefined) => {
    const labels: Record<string, string> = {
      FREE: 'Gratis', BASIC: 'Básico', PRO: 'Profesional', ENTERPRISE: 'Empresarial',
      MONTHLY: 'Mensual', SEMIANNUAL: 'Semestral', YEARLY: 'Anual',
      UNLIMITED: 'Ilimitado', PENDING: 'Pendiente'
    };
    return labels[plan || ''] || plan || 'Básico';
  };

  const safeDocuments = Array.isArray(documents) ? documents : [];
  const safeProducts = Array.isArray(products) ? products : [];

  const totalSales = safeDocuments
    .filter((d: any) => d.type === DocumentType.INVOICE && d.status === SriStatus.AUTHORIZED)
    .reduce((acc: number, d: any) => acc + (d.total || 0), 0);

  const lowStock = safeProducts.filter((p: any) => (p.stock || 0) < (p.minStock || 0) && (p.minStock || 0) > 0);

  useEffect(() => {
    if (!isSuperAdmin) return;
    const loadStats = async () => {
      setLoadingStats(true);
      try {
        const response = await client.get<any>('/api/admin/subscription-stats');
        setSubscriptionStats(response.data);
      } catch (error: any) {
        setSubscriptionStats({
          totalBusinesses: 0, activeBusinesses: 0, expiredBusinesses: 0, expiringBusinesses: 0,
          planDistribution: [], totalUsers: 0, usersByRole: [], recentBusinesses: [], monthlyRevenue: 0
        });
      } finally {
        setLoadingStats(false);
      }
    };
    loadStats();
  }, [isSuperAdmin]);

  useEffect(() => {
    if (isSuperAdmin) return;
    setInsightsLoading(true);
    const fetchInsights = async () => {
      const dataForAI = {
        totalVentas: totalSales,
        inventario: safeProducts.map(p => ({ n: p.description, s: p.stock })),
        documentos: safeDocuments.length
      };
      const result = await getBusinessInsights(dataForAI);
      setInsights(result || 'No se pudo generar la auditoría.');
      setInsightsLoading(false);
    };
    fetchInsights();
  }, [totalSales, safeProducts.length, isSuperAdmin, safeDocuments.length]);

  // =============================================
  // DASHBOARD SUPERADMIN
  // =============================================
  if (isSuperAdmin) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard
            label="Ingresos Mensuales"
            value={`$${(subscriptionStats?.monthlyRevenue || 0).toFixed(2)}`}
            subtitle="Estimado por suscripciones"
            color="emerald"
            icon={<BanknotesIcon className="w-5 h-5" />}
            onClick={() => setActiveTab('saas-admin')}
            loading={loadingStats}
          />
          <StatCard
            label="Empresas Activas"
            value={`${subscriptionStats?.activeBusinesses || 0}/${subscriptionStats?.totalBusinesses || 0}`}
            subtitle="Total registradas"
            color="indigo"
            icon={<BuildingOffice2Icon className="w-5 h-5" />}
            onClick={() => setActiveTab('saas-admin')}
            loading={loadingStats}
          />
          <StatCard
            label="Por Vencer"
            value={`${subscriptionStats?.expiringBusinesses || 0}`}
            subtitle="Próximos 30 días"
            color={(subscriptionStats?.expiringBusinesses || 0) > 0 ? 'amber' : 'indigo'}
            icon={<ExclamationTriangleIcon className="w-5 h-5" />}
            onClick={() => setActiveTab('saas-admin')}
            loading={loadingStats}
          />
          <StatCard
            label="Usuarios Totales"
            value={`${subscriptionStats?.totalUsers || 0}`}
            subtitle="En el sistema"
            color="indigo"
            icon={<UsersIcon className="w-5 h-5" />}
            onClick={() => setActiveTab('saas-admin')}
            loading={loadingStats}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card padding="lg" className="lg:col-span-2">
            <h3 className="font-bold text-slate-800 dark:text-white mb-6 uppercase tracking-tight flex items-center gap-2">
              <CubeIcon className="w-5 h-5 text-indigo-500" />
              Distribución de Suscripciones
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {(subscriptionStats?.planDistribution || []).map((plan, i) => {
                const planPrices: Record<string, number> = {
                  FREE: 0, BASIC: 29.99, PRO: 59.99, ENTERPRISE: 99.99,
                  MONTHLY: 29.99, SEMIANNUAL: 49.99, YEARLY: 99.99, UNLIMITED: 199.99, PENDING: 0
                };
                const revenue = (planPrices[plan.plan] || 0) * plan.count;
                return (
                  <div key={i} className={`p-5 rounded-2xl bg-${planColors[plan.plan] || 'slate'}-50 dark:bg-${planColors[plan.plan] || 'slate'}-500/10 border border-${planColors[plan.plan] || 'slate'}-100 dark:border-${planColors[plan.plan] || 'slate'}-500/20`}>
                    <p className={`text-[10px] font-bold text-${planColors[plan.plan] || 'slate'}-600 dark:text-${planColors[plan.plan] || 'slate'}-400 uppercase mb-1`}>{plan.plan}</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">{plan.count}</p>
                    <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-1">${revenue.toFixed(2)}/mes</p>
                  </div>
                );
              })}
              {(!subscriptionStats?.planDistribution || subscriptionStats.planDistribution.length === 0) && (
                <div className="col-span-4 text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
                  {loadingStats ? <Skeleton width="60%" height="2rem" className="mx-auto" /> : 'Sin datos de suscripciones'}
                </div>
              )}
            </div>

            <h4 className="font-bold text-slate-600 dark:text-slate-300 mb-4 text-sm uppercase tracking-wider">Usuarios por Rol</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(subscriptionStats?.usersByRole || []).map((role, i) => {
                const roleLabels: Record<string, { label: string; icon: React.ReactNode }> = {
                  SUPERADMIN: { label: 'Superadmins', icon: <BuildingOffice2Icon className="w-4 h-4" /> },
                  ADMIN: { label: 'Admins Empresa', icon: <UsersIcon className="w-4 h-4" /> },
                  USER: { label: 'Vendedores', icon: <UsersIcon className="w-4 h-4" /> },
                  VENDEDOR: { label: 'Vendedores', icon: <ShoppingCartIcon className="w-4 h-4" /> },
                  CONTADOR: { label: 'Contadores', icon: <DocumentTextIcon className="w-4 h-4" /> }
                };
                const rl = roleLabels[role.role] || { label: role.role, icon: null };
                return (
                  <div key={i} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1.5">
                      {rl.icon}{rl.label}
                    </p>
                    <p className="text-xl font-bold text-slate-800 dark:text-white">{role.count}</p>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card padding="lg" className="bg-slate-900 dark:bg-slate-900 border-slate-700/50 text-white flex flex-col">
            <h3 className="font-bold mb-6 uppercase tracking-tight text-indigo-400 flex items-center gap-2">
              <BuildingOffice2Icon className="w-5 h-5" />
              Empresas Recientes
            </h3>
            <div className="space-y-4 flex-1 overflow-y-auto pr-2">
              {(subscriptionStats?.recentBusinesses || []).map((b, i) => (
                <div key={b.id || i} className="p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-sm truncate pr-2">{b.name}</h4>
                    <Badge variant={b.isActive ? 'success' : 'danger'}>
                      {b.isActive ? 'ACTIVO' : 'INACTIVO'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span>RUC: {b.ruc}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-indigo-400">{b.plan}</span>
                    <span className="text-slate-600">•</span>
                    <span>{b._count?.users || 0} usuarios</span>
                  </div>
                  <div className="mt-2 text-[10px] text-slate-500">
                    Vence: {b.subscriptionEnd ? new Date(b.subscriptionEnd).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              ))}
              {(!subscriptionStats?.recentBusinesses || subscriptionStats.recentBusinesses.length === 0) && (
                <div className="text-center py-8 text-slate-500">
                  {loadingStats ? <Skeleton width="80%" height="3rem" className="mx-auto mb-2" /> : (
                    <div className="flex flex-col items-center gap-2">
                      <InboxIcon className="w-8 h-8" />
                      <p className="text-sm">Sin empresas registradas</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => setActiveTab('saas-admin')}
              className="mt-6 w-full py-4 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
            >
              Ver Panel SaaS Completo
            </button>
          </Card>
        </div>

        {(subscriptionStats?.expiredBusinesses || 0) > 0 && (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-4 sm:p-6 rounded-2xl flex items-center gap-3 sm:gap-4">
            <div className="w-10 sm:w-12 h-10 sm:h-12 bg-red-500 text-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-red-200 dark:shadow-red-500/20">
              <BellAlertIcon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-red-800 dark:text-red-300 text-sm">
                {subscriptionStats?.expiredBusinesses} empresa(s) con suscripción expirada
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                Estas empresas podrían perder acceso al sistema. Revise el panel SaaS para gestionar sus suscripciones.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('saas-admin')}
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
  // DASHBOARD ADMIN / USER
  // =============================================
  return (
    <div className="space-y-8 animate-fade-in">
      {isAdmin && businessInfo && businessInfo.plan !== 'UNLIMITED' && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl border border-slate-700/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${
                subscriptionStatusColor === 'emerald' ? 'bg-emerald-500/20' :
                subscriptionStatusColor === 'amber' ? 'bg-amber-500/20' : 'bg-red-500/20'
              }`}>
                {subscriptionDaysRemaining === null
                  ? <SparklesIcon className="w-7 h-7 text-emerald-400" />
                  : subscriptionDaysRemaining < 0
                    ? <ExclamationTriangleIcon className="w-7 h-7 text-red-400" />
                    : <CalendarDaysIcon className="w-7 h-7 text-indigo-400" />
                }
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Suscripción</div>
                <div className="text-xl font-bold">
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
                className={`px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all shadow-lg ${
                  subscriptionStatusColor === 'red'
                    ? 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/30' :
                    subscriptionStatusColor === 'amber'
                      ? 'bg-amber-500 hover:bg-amber-400 text-white shadow-amber-500/30'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                }`}
              >
                {subscriptionDaysRemaining !== null && subscriptionDaysRemaining < 30 ? 'Renovar' : 'Gestionar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isAdmin && businessInfo && businessInfo.plan === 'UNLIMITED' && (
        <div className="bg-gradient-to-r from-emerald-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-emerald-500/30">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl bg-emerald-500/20">
              <SparklesIcon className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">Suscripción Activa</div>
              <div className="text-xl font-bold text-emerald-400">Plan Ilimitado</div>
              <div className="text-xs text-slate-400 mt-1">
                Disfruta de todas las funcionalidades sin límites
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          label="Ventas Reales"
          value={`$${(totalSales || 0).toFixed(2)}`}
          subtitle="Total facturado"
          color="emerald"
          icon={<BanknotesIcon className="w-5 h-5" />}
          onClick={() => setActiveTab('reports')}
        />
        <StatCard
          label="Alertas Inventario"
          value={`${lowStock.length}`}
          subtitle="Items bajos"
          color={lowStock.length > 0 ? 'rose' : 'indigo'}
          icon={<CubeIcon className="w-5 h-5" />}
          onClick={() => setActiveTab('products')}
        />
        <StatCard
          label="Emitidos Hoy"
          value={`${safeDocuments.length}`}
          subtitle="Doc. SRI"
          color="indigo"
          icon={<DocumentTextIcon className="w-5 h-5" />}
          onClick={() => setActiveTab('reports')}
        />
        <StatCard
          label="IVA Neto"
          value={`$${((totalSales || 0) * 0.15).toFixed(2)}`}
          subtitle="Estimado"
          color="indigo"
          icon={<ArrowTrendingUpIcon className="w-5 h-5" />}
          onClick={() => setActiveTab('reports')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <Card padding="lg" className="lg:col-span-2 min-h-[300px] sm:min-h-[400px]">
          <h3 className="font-bold text-slate-800 dark:text-white mb-6 uppercase tracking-tight text-sm sm:text-lg flex justify-between items-center">
            Auditoría en Tiempo Real
            <span className="text-[8px] opacity-30 font-mono">v1.1</span>
          </h3>
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 sm:p-6 rounded-2xl border border-slate-100 dark:border-slate-700/50 flex items-start gap-3 sm:gap-4">
            <div className="w-10 sm:w-12 h-10 sm:h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-200 dark:shadow-indigo-500/20">
              <SparklesIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="flex-1">
              {insightsLoading ? (
                <div className="space-y-2">
                  <Skeleton width="90%" height="1rem" />
                  <Skeleton width="75%" height="1rem" />
                  <Skeleton width="60%" height="1rem" />
                </div>
              ) : (
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 font-medium italic">
                  "{insights}"
                </p>
              )}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4">
            <div
              onClick={() => setActiveTab('products')}
              className="p-6 rounded-2xl bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/20 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-500/10 transition-colors"
            >
              <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase mb-2">Top Producto</p>
              <p className="font-bold text-slate-800 dark:text-white">Licencia Cloud Pro</p>
            </div>
            <div
              onClick={() => setActiveTab('config')}
              className="p-6 rounded-2xl bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/20 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-500/10 transition-colors"
            >
              <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase mb-2">Próximo Vencimiento</p>
              <p className="font-bold text-slate-800 dark:text-white">Firma Electrónica: 28 Jul</p>
            </div>
          </div>
        </Card>

        <Card padding="lg" className="bg-slate-900 dark:bg-slate-900 border-slate-700/50 text-white flex flex-col">
          <h3 className="font-bold mb-6 uppercase tracking-tight text-indigo-400 text-sm sm:text-base">Estado de Inventario</h3>
          <div className="space-y-6 flex-1 overflow-y-auto pr-2">
            {safeProducts.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <InboxIcon className="w-10 h-10 mx-auto mb-2" />
                <p className="text-sm">No hay productos registrados</p>
                <button
                  onClick={() => setActiveTab('products')}
                  className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-xs font-bold transition-colors"
                >
                  Agregar Productos
                </button>
              </div>
            ) : (
              safeProducts.slice(0, 10).map(p => (
                <div key={p.id} className="flex flex-col gap-2">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-wider gap-2">
                    <span className="truncate w-20 sm:w-40">{p.description}</span>
                    <span className={p.stock < p.minStock ? 'text-rose-400' : 'text-indigo-400'}>{p.stock} un.</span>
                  </div>
                  <div className="h-2 bg-slate-800 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ${p.stock < p.minStock ? 'bg-rose-500' : 'bg-indigo-500'}`}
                      style={{ width: `${Math.min((p.stock / 100) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
          <button
            onClick={() => setActiveTab('products')}
            className="mt-6 sm:mt-8 w-full py-3 sm:py-4 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-xs uppercase tracking-widest transition-all min-h-[48px]"
          >
            {safeProducts.length > 0 ? 'Ver Inventario Completo' : 'Agregar Productos'}
          </button>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
