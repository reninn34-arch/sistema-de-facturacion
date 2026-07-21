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
  TrophyIcon,
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
  pointsProgramEnabled?: boolean;
  planMaxInvoices?: number;
  onSetReportsFilter?: (filter: string) => void;
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

const Dashboard: React.FC<DashboardProps> = ({ documents, products, setActiveTab, currentUser, businessInfo, planHasAudit, planDurationDays = 30, planMaxInvoices, hasModuleControl = false, modulePermissions = [], pointsProgramEnabled = false, onSetReportsFilter }) => {
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

  const [selectedEstablishment, setSelectedEstablishment] = useState<string>('ALL');

  const safeDocuments = Array.isArray(documents) ? documents : [];
  const safeProducts = Array.isArray(products) ? products : [];

  const filteredDocuments = React.useMemo(() => {
    if (selectedEstablishment === 'ALL') return safeDocuments;
    return safeDocuments.filter((d: any) => d.establishmentCode === selectedEstablishment || d.number?.startsWith(selectedEstablishment));
  }, [safeDocuments, selectedEstablishment]);

  const totalSales = filteredDocuments
    .filter((d: any) => d.type === DocumentType.INVOICE && (d.status === SriStatus.AUTHORIZED || d.status === 'AUTORIZADO'))
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

    // Verificar acceso al módulo audit según el rol/permiso del empleado
    const isEmployee = currentUser && currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPERADMIN';
    if (isEmployee && modulePermissions.length > 0) {
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
                  FREE: 0, BASIC: 30.43, GASTRONOMICO: 78.26, PRO: 130.43, ENTERPRISE: 217.39,
                  MONTHLY: 30.43, SEMIANNUAL: 130.43, YEARLY: 217.39, UNLIMITED: 0, PENDING: 0
                };
                const revenue = (planPrices[plan.plan] || 0) * plan.count;
                return (
                  <div key={plan.plan} className={`p-5 rounded-2xl bg-${planColors[plan.plan] || 'slate'}-100 dark:bg-${planColors[plan.plan] || 'slate'}-500/10 transition-all hover:scale-[1.02]`}>
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
                  <div key={role.role} className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/50 transition-all hover:bg-slate-200/60">
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
              {(subscriptionStats?.recentBusinesses || []).map((b) => (
                <div key={b.id} className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl transition-all hover:bg-slate-100 group">
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
            <button type="button"
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
            <button type="button"
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
  
  const now = new Date();
  const timeString = now.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
  const dateString = now.toLocaleDateString('es-EC', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Calcular estadísticas de comprobantes del mes actual
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const docsThisMonth = safeDocuments.filter(d => {
    const dDate = new Date(d.createdAt || d.issueDate || Date.now());
    return dDate.getMonth() === currentMonth && dDate.getFullYear() === currentYear;
  });

  const invoiceDocsThisMonth = docsThisMonth.filter(d =>
    d.type === DocumentType.INVOICE && d.status !== 'CANCELLED'
  );

  const totalEmitted = invoiceDocsThisMonth.length;
  const totalAuthorized = docsThisMonth.filter(d => d.status === SriStatus.AUTHORIZED || d.status === 'AUTORIZADO').length;
  const totalRejected = docsThisMonth.filter(d => d.status === 'RECHAZADO' || d.status === 'NO_AUTORIZADO' || d.status === 'DEVUELTO').length;

  const maxDocs = planMaxInvoices !== undefined ? planMaxInvoices : 300;
  
  const isUnlimitedDocs = maxDocs === -1 || maxDocs === 999999 || businessInfo?.plan === 'UNLIMITED';
  
  // Solo en produccion se descuenta del plan. En pruebas no hay limite.
  const isProduction = businessInfo?.isProduction === true;
  const consumedDocs = isProduction ? totalEmitted : 0;
  
  const docsAvailable = isUnlimitedDocs ? '∞' : Math.max(0, maxDocs - consumedDocs);
  const docsPercentage = isUnlimitedDocs || !isProduction ? 0 : Math.min(1, consumedDocs / maxDocs);
  const remainingPercentage = isUnlimitedDocs || !isProduction ? 1 : Math.max(0, 1 - docsPercentage);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ROW 1: Welcome & Subscription */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Welcome Card */}
        <Card padding="none" className="lg:col-span-2 overflow-hidden relative bg-gradient-to-br from-indigo-50 to-white dark:from-slate-800 dark:to-slate-900 border-none shadow-sm flex">
          <div className="p-4 md:p-5 flex flex-col justify-between md:w-2/3 z-10 relative">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white tracking-tight mb-0.5">
                ¡Hola, {currentUser?.name?.split(' ')[0] || 'Bienvenido'}! 👋
              </h2>
              <p className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400 font-medium capitalize">
                {dateString} • {timeString}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              <button type="button"
                onClick={() => setActiveTab('invoices')}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-[11px] shadow-lg shadow-sky-500/30 transition-all flex items-center justify-center gap-1.5"
              >
                <DocumentTextIcon className="w-3.5 h-3.5" />
                Generar Factura
              </button>
              <button type="button"
                onClick={() => setActiveTab('help')}
                className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-[11px] hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-1.5"
              >
                Ver Tutoriales
              </button>
            </div>
          </div>
          
          {/* 3D Illustration */}
          <div className="absolute right-0 bottom-0 top-0 w-1/3 hidden md:flex items-center justify-center pointer-events-none opacity-90">
            <img 
              src="/images/dashboard-illustration.png" 
              alt="Dashboard 3D" 
              className="object-cover h-[105%] w-auto max-w-none transform translate-x-8 translate-y-2"
            />
          </div>
        </Card>

        {/* Subscription Card */}
        <Card padding="none" className="bg-white dark:bg-slate-900 p-4 md:p-5 flex flex-col justify-between border-none shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tu Plan Actual</p>
              <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                <SparklesIcon className="w-3.5 h-3.5 text-sky-500" />
                {getPlanLabel(businessInfo?.plan)}
              </h3>
            </div>
            <Badge variant={subscriptionStatusColor === 'emerald' ? 'success' : subscriptionStatusColor === 'amber' ? 'warning' : 'error'}>
              {businessInfo?.plan === 'UNLIMITED' ? 'ACTIVO' : subscriptionDaysRemaining !== null && subscriptionDaysRemaining > 0 ? 'ACTIVO' : 'VENCIDO'}
            </Badge>
          </div>

          <div className="flex items-center gap-4 flex-1 py-1.5">
            <div className="relative w-16 h-16 flex-shrink-0">
              {businessInfo?.plan === 'UNLIMITED' ? (
                <div className="w-full h-full rounded-full border-2 border-emerald-100 dark:border-emerald-900/30 flex items-center justify-center bg-emerald-50 dark:bg-emerald-900/10">
                  <SparklesIcon className="w-6 h-6 text-emerald-500" />
                </div>
              ) : (
                <>
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                    <circle 
                      cx="32" 
                      cy="32" 
                      r="28" 
                      stroke="currentColor" 
                      strokeWidth="4" 
                      fill="transparent" 
                      strokeDasharray={`${2 * Math.PI * 28}`}
                      strokeDashoffset={`${2 * Math.PI * 28 * (1 - Math.max(0, Math.min(1, (subscriptionDaysRemaining || 0) / planDurationDays)))}`}
                      className={`transition-all duration-1000 ${subscriptionStatusColor === 'emerald' ? 'text-emerald-500' : subscriptionStatusColor === 'amber' ? 'text-amber-500' : 'text-red-500'}`} 
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-sm font-black leading-none text-slate-800 dark:text-white">{subscriptionDaysRemaining !== null && subscriptionDaysRemaining > 0 ? subscriptionDaysRemaining : 0}</span>
                    <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">Días</span>
                  </div>
                </>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Línea de Tiempo</p>
              <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                {businessInfo?.plan === 'UNLIMITED' 
                  ? 'Sin límite de tiempo' 
                  : `Vence: ${businessInfo?.subscriptionEnd ? new Date(businessInfo.subscriptionEnd).toLocaleDateString('es-EC', {day: 'numeric', month: 'short', year: 'numeric'}) : 'N/A'}`}
              </p>
            </div>
          </div>

          {isAdmin && businessInfo?.plan !== 'UNLIMITED' && (
            <button type="button"
              onClick={() => setActiveTab('pago-interno')}
              className={`w-full py-1.5 mt-2 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all ${subscriptionStatusColor === 'red' || (subscriptionDaysRemaining !== null && subscriptionDaysRemaining <= 5)
                ? 'bg-red-50 hover:bg-red-600 text-white' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
            >
              Renovar Plan
            </button>
          )}
        </Card>
      </div>

      {pointsProgramEnabled && (() => {
        const points = (businessInfo as any)?.points || 0;
        if (points <= 0 && (businessInfo as any)?.referralCode) return null;
        return (
          <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
                <TrophyIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-sm text-amber-800">{points > 0 ? `${points} Puntos Acumulados` : 'Programa de Puntos'}</p>
                <p className="text-xs text-amber-600">{points > 0 ? 'Invita empresas y canjea premios' : 'Activa tu codigo de referido'}</p>
              </div>
            </div>
            <button type="button" onClick={() => setActiveTab('security-points')} className="px-4 py-2 bg-amber-500 text-white rounded-xl font-bold text-xs hover:bg-amber-600 transition-all">
              Ver Puntos
            </button>
          </div>
        );
      })()}

      {/* ROW 2: Documents Summary (Shopify Analytics Style) */}
      <Card padding="none" className="bg-white dark:bg-slate-900 border-none shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20 flex-wrap gap-3">
          <h3 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wide flex items-center gap-2">
            <ArrowTrendingUpIcon className="w-5 h-5 text-sky-500" />
            Rendimiento del Mes
          </h3>
          <div className="flex items-center gap-3">
            <select
              value={selectedEstablishment}
              onChange={e => setSelectedEstablishment(e.target.value)}
              className="p-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none"
            >
              <option value="ALL">🏢 Todas las Sucursales</option>
              <option value="001">001 - Matriz Principal</option>
              <option value="002">002 - Sucursal Norte</option>
              <option value="003">003 - Sucursal Sur</option>
            </select>
            <button type="button" onClick={() => setActiveTab('reports')} className="text-xs font-bold text-sky-500 hover:text-sky-600 flex items-center gap-1">
              Ver Reportes <ArrowRightIcon className="w-3 h-3" />
            </button>
          </div>
        </div>
         <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800/50">
          <div role="button" tabIndex={0} className="p-6 md:p-8 flex flex-col justify-center transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30 cursor-pointer" onClick={() => setActiveTab('reports')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab('reports'); } }}>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <DocumentTextIcon className="w-4 h-4" /> Comprobantes Emitidos
            </p>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl md:text-5xl font-black text-slate-800 dark:text-white tracking-tighter">{totalEmitted}</span>
              <span className="text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-md">Total Mes</span>
            </div>
          </div>
          
          <div role="button" tabIndex={0} className="p-6 md:p-8 flex flex-col justify-center transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30 cursor-pointer" onClick={() => setActiveTab('reports')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab('reports'); } }}>
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <CheckCircleIcon className="w-4 h-4" /> Autorizados SRI
            </p>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white tracking-tighter">{totalAuthorized}</span>
              <span className="text-xs font-medium text-slate-500">{totalEmitted > 0 ? Math.round((totalAuthorized/totalEmitted)*100) : 0}% de emitidos</span>
            </div>
          </div>
          
          <div role="button" tabIndex={0} className="p-6 md:p-8 flex flex-col justify-center transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30 cursor-pointer" onClick={() => { if (onSetReportsFilter) onSetReportsFilter('REJECTED'); setActiveTab('reports'); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (onSetReportsFilter) onSetReportsFilter('REJECTED'); setActiveTab('reports'); } }}>
            <p className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <XCircleIcon className="w-4 h-4" /> No Autorizados
            </p>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white tracking-tighter">{totalRejected}</span>
              <span className="text-xs font-medium text-slate-500">Requieren atención</span>
            </div>
          </div>

          <div role="button" tabIndex={0} className="p-6 md:p-8 flex items-center gap-4 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30 cursor-pointer" onClick={() => setActiveTab('reports')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab('reports'); } }}>
            <div className="relative w-14 h-14 flex-shrink-0">
              {isUnlimitedDocs ? (
                <div className="w-full h-full rounded-full border-2 border-sky-100 dark:border-sky-900/30 flex items-center justify-center bg-sky-50 dark:bg-sky-900/10">
                  <DocumentTextIcon className="w-5 h-5 text-sky-500" />
                </div>
              ) : (
                <>
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                    <circle 
                      cx="28" 
                      cy="28" 
                      r="24" 
                      stroke="currentColor" 
                      strokeWidth="4" 
                      fill="transparent" 
                      strokeDasharray={`${2 * Math.PI * 24}`}
                      strokeDashoffset={`${2 * Math.PI * 24 * (1 - remainingPercentage)}`}
                      className="transition-all duration-1000 text-sky-500" 
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-sm font-black leading-none text-slate-800 dark:text-white">{isUnlimitedDocs ? '∞' : docsAvailable}</span>
                    <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">Disp.</span>
                  </div>
                </>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                <DocumentTextIcon className="w-4 h-4 text-sky-500" /> Facturas Plan
              </p>
              <div className="flex flex-col gap-0.5">
                <span className="text-xl md:text-2xl font-black text-slate-800 dark:text-white leading-none">
                  {isUnlimitedDocs ? 'Ilimitadas' : `${docsAvailable} disp.`}
                </span>
                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 truncate">
                  {isUnlimitedDocs ? 'Consumo sin límites' : `de ${maxDocs} incluidas`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {(() => {
        const topClientsDashboard = (() => {
          const map: Record<string, { name: string; total: number; count: number }> = {};
          safeDocuments.forEach((doc: any) => {
            if (doc.type === '01' && (doc.status === 'AUTORIZADA' || doc.status === 'AUTORIZADO')) {
              const key = doc.entityName || 'CONSUMIDOR FINAL';
              if (!map[key]) map[key] = { name: key, total: 0, count: 0 };
              map[key].total += doc.total || 0;
              map[key].count += 1;
            }
          });
          return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 5);
        })();
        if (topClientsDashboard.length === 0) return null;
        return (
      <Card padding="lg" className="bg-white dark:bg-slate-900 border-none shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800 dark:text-white uppercase tracking-tight text-sm flex items-center gap-2">
            <TrophyIcon className="w-5 h-5 text-amber-500" />
            Top 5 Clientes
          </h3>
          <button type="button" onClick={() => setActiveTab('reports')} className="text-xs font-bold text-sky-500 hover:text-sky-600 flex items-center gap-1">
            Ver Reporte <ArrowRightIcon className="w-3 h-3" />
          </button>
        </div>
        <div className="space-y-3">
          {topClientsDashboard.map((client, idx) => (
            <div key={client.name} className="flex items-center gap-3">
              <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${idx === 0 ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{client.name}</span>
                  <span className="text-xs font-black text-sky-500 ml-2 flex-shrink-0">${client.total.toFixed(0)}</span>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-400 to-sky-500 rounded-full transition-all duration-700"
                    style={{ width: `${Math.max(5, (client.total / (topClientsDashboard[0]?.total || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Auditoría: ocultar si el módulo está denegado vía permisos */}
        {(() => {
          const isEmployee = currentUser && currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPERADMIN';
          if (isEmployee && modulePermissions.length > 0) {
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
              <button type="submit"
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
                      <div key={`${issue.category}-${issue.title}`} className={`border rounded-2xl p-4 ${severityColors[issue.severity]} transition-all`}>
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
                          <button type="button"
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
                    {auditResult.recommendations.map((rec) => (
                      <p key={rec} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
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
                <button type="button"
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
          <button type="button"
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
