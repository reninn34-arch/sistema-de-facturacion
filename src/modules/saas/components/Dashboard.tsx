import React, { useState, useEffect } from 'react';
import { getAuditReport, AuditResult, AuditIssue } from '../../../services/geminiService';
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
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ShieldExclamationIcon,
  ArrowRightIcon,
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
  planHasAudit?: boolean;
  planDurationDays?: number;
  hasModuleControl?: boolean;
  modulePermissions?: { moduleCode: string; granted: boolean }[];
}

const planColors: Record<string, string> = {
  FREE: 'slate',
  BASIC: 'indigo',
  GASTRONOMICO: 'sky',
  PRO: 'purple',
  ENTERPRISE: 'emerald',
  MONTHLY: 'cyan',
  SEMIANNUAL: 'sky',
  YEARLY: 'indigo',
  UNLIMITED: 'rose',
  PENDING: 'gray'
};

const Dashboard: React.FC<DashboardProps> = ({ documents, products, setActiveTab, currentUser, businessInfo, planHasAudit, planDurationDays = 30, hasModuleControl = false, modulePermissions = [] }) => {
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditError, setAuditError] = useState<string | null>(null);
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
    const redThreshold = Math.max(Math.ceil(planDurationDays * 0.20), 3);
    const amberThreshold = Math.max(Math.ceil(planDurationDays * 0.50), 7);
    if (subscriptionDaysRemaining <= redThreshold) return 'red';
    if (subscriptionDaysRemaining <= amberThreshold) return 'amber';
    return 'emerald';
  }, [subscriptionDaysRemaining, planDurationDays]);

  const getPlanLabel = (plan: string | undefined) => {
    const labels: Record<string, string> = {
      FREE: 'Gratis', BASIC: 'Básico', GASTRONOMICO: 'Gastronómico', PRO: 'Profesional', ENTERPRISE: 'Empresarial',
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
    if (!planHasAudit) {
      setAuditLoading(false);
      setAuditResult(null);
      return;
    }

    // Si hasModuleControl está activo, verificar permiso explícito del módulo audit
    const isEmployee = currentUser && currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPERADMIN';
    if (hasModuleControl && isEmployee) {
      const auditPerm = modulePermissions.find(p => p.moduleCode === 'audit');
      if (!auditPerm || !auditPerm.granted) {
        setAuditLoading(false);
        setAuditResult(null);
        return;
      }
    }
    setAuditLoading(true);
    setAuditError(null);
    const fetchAudit = async () => {
      try {
        const result = await getAuditReport();
        setAuditResult(result);
      } catch (e) {
        setAuditError('No se pudo ejecutar la auditoría.');
      } finally {
        setAuditLoading(false);
      }
    };
    fetchAudit();
  }, [totalSales, safeProducts.length, isSuperAdmin, safeDocuments.length, planHasAudit]);

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
            onClick={() => {
              sessionStorage.setItem('saasAdminTab', 'expiring');
              setActiveTab('saas-admin');
            }}
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
              <CubeIcon className="w-5 h-5 text-sky-500" />
              Distribución de Suscripciones
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {(subscriptionStats?.planDistribution || []).map((plan, i) => {
                const planPrices: Record<string, number> = {
                  FREE: 0, BASIC: 29.99, GASTRONOMICO: 79.99, PRO: 149.99, ENTERPRISE: 249.99,
                  MONTHLY: 29.99, SEMIANNUAL: 149.99, YEARLY: 249.99, UNLIMITED: 0, PENDING: 0
                };
                const revenue = (planPrices[plan.plan] || 0) * plan.count;
                return (
                  <div key={i} className={`p-5 rounded-2xl bg-${planColors[plan.plan] || 'slate'}-100 dark:bg-${planColors[plan.plan] || 'slate'}-500/10 transition-all hover:scale-[1.02]`}>
                    <p className={`text-[10px] font-black text-${planColors[plan.plan] || 'slate'}-700 dark:text-${planColors[plan.plan] || 'slate'}-400 uppercase mb-1 tracking-widest`}>{plan.plan}</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">{plan.count}</p>
                    <p className={`text-[10px] font-bold text-${planColors[plan.plan] || 'slate'}-600 dark:text-slate-500 mt-1`}>${revenue.toFixed(2)}/mes</p>
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
                  <div key={i} className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/50 transition-all hover:bg-slate-200/60">
                    <p className="text-xs font-black text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1.5 uppercase tracking-tighter">
                      {rl.icon}{rl.label}
                    </p>
                    <p className="text-xl font-black text-slate-900 dark:text-white">{role.count}</p>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card padding="lg" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/50 text-slate-800 dark:text-white flex flex-col transition-colors duration-300">
            <h3 className="font-bold mb-6 uppercase tracking-tight text-sky-500 dark:text-sky-400 flex items-center gap-2">
              <BuildingOffice2Icon className="w-5 h-5" />
              Empresas Recientes
            </h3>
            <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {(subscriptionStats?.recentBusinesses || []).map((b, i) => (
                <div key={b.id || i} className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl transition-all hover:bg-slate-100 group">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-sm truncate pr-2 text-slate-800 dark:text-white group-hover:text-sky-500 transition-colors">{b.name}</h4>
                    <Badge variant={b.isActive ? 'success' : 'danger'}>
                      {b.isActive ? 'ACTIVO' : 'INACTIVO'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                    <span>RUC: {b.ruc}</span>
                    <span className="text-slate-200 dark:text-slate-600">•</span>
                    <span className="text-sky-500 dark:text-sky-400 font-bold">{b.plan}</span>
                    <span className="text-slate-200 dark:text-slate-600">•</span>
                    <span>{b._count?.users || 0} usuarios</span>
                  </div>
                  <div className="mt-2 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
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
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${subscriptionStatusColor === 'emerald' ? 'bg-emerald-500/20' :
                  subscriptionStatusColor === 'amber' ? 'bg-amber-500/20' : 'bg-red-500/20'
                }`}>
                {subscriptionDaysRemaining === null
                  ? <SparklesIcon className="w-7 h-7 text-emerald-400" />
                  : subscriptionDaysRemaining < 0
                    ? <ExclamationTriangleIcon className="w-7 h-7 text-red-400" />
                    : <CalendarDaysIcon className="w-7 h-7 text-sky-400" />
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
                    className={`h-full transition-all duration-500 ${subscriptionStatusColor === 'emerald' ? 'bg-emerald-500' :
                        subscriptionStatusColor === 'amber' ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                    style={{ width: subscriptionDaysRemaining === null ? '100%' : `${Math.min(Math.max((subscriptionDaysRemaining / planDurationDays) * 100, 0), 100)}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-400 mt-1 text-center">Tiempo restante</div>
              </div>
              <button
                onClick={() => setActiveTab('pago-interno')}
                className={`px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all shadow-lg ${subscriptionStatusColor === 'red'
                    ? 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/30' :
                    subscriptionStatusColor === 'amber'
                      ? 'bg-amber-500 hover:bg-amber-400 text-white shadow-amber-500/30'
                      : 'bg-sky-500 hover:bg-sky-600 text-white shadow-sky-500/30'
                  }`}
              >
                {subscriptionDaysRemaining !== null && subscriptionDaysRemaining <= Math.max(Math.ceil(planDurationDays * 0.20), 3) ? 'Renovar' : 'Gestionar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isAdmin && businessInfo && businessInfo.plan === 'UNLIMITED' && (
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 dark:from-emerald-900 dark:to-slate-900 rounded-[2rem] p-8 text-white shadow-xl shadow-emerald-500/10 transition-all hover:scale-[1.01] duration-300">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-3xl bg-white/20 backdrop-blur-sm">
              <SparklesIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="text-[10px] font-black text-emerald-200 uppercase tracking-[0.2em] mb-1">Estatus Premium</div>
              <div className="text-2xl font-black text-white uppercase tracking-tighter">Plan Ilimitado Activo</div>
              <div className="text-sm text-emerald-50/70 mt-1 font-medium italic">
                "Tu empresa no tiene límites de crecimiento con Azul"
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
          color={lowStock.length > 0 ? 'amber' : 'slate'}
          icon={<ExclamationTriangleIcon className="w-5 h-5" />}
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
        {/* Auditoría: ocultar si el módulo está denegado vía permisos */}
        {(() => {
          const isEmployee = currentUser && currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPERADMIN';
          if (hasModuleControl && isEmployee) {
            const auditPerm = modulePermissions.find(p => p.moduleCode === 'audit');
            if (!auditPerm || !auditPerm.granted) return null;
          }
          return (
        <Card padding="lg" className="lg:col-span-2 min-h-[300px] sm:min-h-[400px]">
          <h3 className="font-bold text-slate-800 dark:text-white mb-4 uppercase tracking-tight text-sm sm:text-lg flex justify-between items-center">
            Auditoría en Tiempo Real
            <span className="text-[10px] font-medium text-slate-400">
              {auditResult ? new Date(auditResult.generatedAt).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }) : ''}
            </span>
          </h3>

          {!planHasAudit ? (
            <div className="bg-gradient-to-br from-indigo-50/50 to-violet-50/50 dark:from-indigo-900/20 dark:to-violet-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-2xl p-8 text-center relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <SparklesIcon className="w-20 h-20 text-indigo-500" />
              </div>
              <SparklesIcon className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
              <p className="text-indigo-700 dark:text-indigo-300 font-bold text-lg">Auditoría en Tiempo Real</p>
              <p className="text-indigo-600/70 dark:text-indigo-400/70 text-sm mt-2 max-w-md mx-auto">
                Detecta facturas rechazadas, inventario bajo, duplicados y más automáticamente con nuestro asistente inteligente.
              </p>
              <button
                onClick={() => setActiveTab('pago-interno')}
                className="mt-6 px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 text-sm flex items-center gap-2 mx-auto"
              >
                <SparklesIcon className="w-4 h-4" />
                Actualizar Plan para Desbloquear
              </button>
            </div>
          ) : auditLoading ? (
            <div className="space-y-3">
              <Skeleton width="100%" height="2.5rem" />
              <Skeleton width="90%" height="4rem" />
              <Skeleton width="80%" height="4rem" />
              <Skeleton width="70%" height="4rem" />
            </div>
          ) : auditError ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-center">
              <XCircleIcon className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-red-600 dark:text-red-400 font-medium">{auditError}</p>
            </div>
          ) : !auditResult ? null : (
            <div className="space-y-4">
              {/* Summary badges */}
              <div className="flex flex-wrap gap-3 mb-2">
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  <CheckCircleIcon className="w-4 h-4" /> {auditResult.summary.authorizedDocuments} Autorizadas
                </div>
                {auditResult.summary.pendingDocuments > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300">
                    <ClockIcon className="w-4 h-4" /> {auditResult.summary.pendingDocuments} Pendientes
                  </div>
                )}
                {auditResult.summary.rejectedDocuments > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-xl text-xs font-bold text-red-700 dark:text-red-300">
                    <XCircleIcon className="w-4 h-4" /> {auditResult.summary.rejectedDocuments} Rechazadas
                  </div>
                )}
                {auditResult.summary.totalIssues === 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    <SparklesIcon className="w-4 h-4" /> Todo en orden
                  </div>
                )}
              </div>

              {/* Issues */}
              {auditResult.issues.length === 0 ? (
                <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800 rounded-2xl p-8 text-center">
                  <CheckCircleIcon className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                  <p className="text-emerald-700 dark:text-emerald-300 font-bold text-lg">Sin problemas detectados</p>
                  <p className="text-emerald-600 dark:text-emerald-400 text-sm mt-1">Todos los documentos están autorizados, el inventario está estable y no hay alertas fiscales.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  {auditResult.issues.map((issue: AuditIssue, i: number) => {
                    const severityColors: Record<string, string> = {
                      high: 'border-red-200 dark:border-red-800 bg-red-50/80 dark:bg-red-900/10',
                      medium: 'border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-900/10',
                      low: 'border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/20'
                    };
                    const severityIcons: Record<string, React.ReactNode> = {
                      high: <ShieldExclamationIcon className="w-5 h-5 text-red-500" />,
                      medium: <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />,
                      low: <BellAlertIcon className="w-5 h-5 text-slate-400" />
                    };
                    return (
                      <div key={i} className={`border rounded-2xl p-4 ${severityColors[issue.severity]} transition-all`}>
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {severityIcons[issue.severity]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={issue.severity === 'high' ? 'error' : issue.severity === 'medium' ? 'warning' : 'default'} size="sm">
                                {issue.category}
                              </Badge>
                            </div>
                            <p className="font-bold text-slate-800 dark:text-white text-sm">{issue.title}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{issue.description}</p>
                          </div>
                          <button
                            onClick={() => setActiveTab(issue.actionTab)}
                            className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-bold text-sky-500 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/30 transition-colors"
                          >
                            {issue.action} <ArrowRightIcon className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Recommendations */}
              {auditResult.recommendations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Recomendaciones</p>
                  <div className="space-y-1">
                    {auditResult.recommendations.map((rec, i) => (
                      <p key={i} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                        <SparklesIcon className="w-3 h-3 text-sky-400 flex-shrink-0 mt-0.5" />
                        {rec}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
          );
        })()}

        <Card padding="lg" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/50 text-slate-800 dark:text-white flex flex-col transition-colors duration-300">
          <h3 className="font-bold mb-6 uppercase tracking-tight text-slate-400 text-sm sm:text-base flex items-center gap-2">
            <CubeIcon className="w-5 h-5 text-sky-500" />
            Estado de Inventario
          </h3>
          <div className="space-y-6 flex-1 overflow-y-auto pr-2">
            {safeProducts.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <InboxIcon className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                <p className="text-sm">No hay productos registrados</p>
                <button
                  onClick={() => setActiveTab('products')}
                  className="mt-4 px-4 py-2 bg-sky-500 hover:bg-sky-600 rounded-lg text-xs font-bold text-white transition-colors"
                >
                  Agregar Productos
                </button>
              </div>
            ) : (
              safeProducts.slice(0, 10).map(p => (
                <div key={p.id} className="flex flex-col gap-2 group">
                  <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider gap-2">
                    <span className="truncate w-20 sm:w-40 text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{p.description}</span>
                    <span className={p.stock < p.minStock ? 'text-rose-500' : 'text-sky-500'}>{p.stock} un.</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ${p.stock < p.minStock ? 'bg-rose-500' : 'bg-sky-500'}`}
                      style={{ width: `${Math.min((p.stock / 100) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
          <button
            onClick={() => setActiveTab('products')}
            className="mt-6 sm:mt-8 w-full py-3 sm:py-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl font-bold text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest transition-all min-h-[48px] border border-slate-100 dark:border-slate-700"
          >
            {safeProducts.length > 0 ? 'Ver Inventario Completo' : 'Agregar Productos'}
          </button>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
