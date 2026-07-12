import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import EnvironmentModal from '../components/EnvironmentModal';
import { AppNotification, BusinessInfo } from '../types/types';
import {
  BuildingOffice2Icon,
  ChartBarIcon,
  DocumentTextIcon,
  ArrowUturnLeftIcon,
  DevicePhoneMobileIcon,
  CubeIcon,
  BookOpenIcon,
  CreditCardIcon,
  UserGroupIcon,
  DocumentIcon,
  ArrowPathIcon,
  BanknotesIcon,
  TruckIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  TagIcon,
  LinkIcon,
  EnvelopeIcon,
  Cog6ToothIcon,
  SparklesIcon,
  ArrowRightOnRectangleIcon,
  BellIcon,
  Bars3Icon,
  XMarkIcon,
  BeakerIcon,
  ClipboardDocumentCheckIcon,
  TicketIcon,
  DocumentArrowUpIcon,
  GlobeAltIcon,
  ShieldExclamationIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  TrophyIcon,
  ShoppingCartIcon,
} from '@heroicons/react/24/outline';

interface LayoutProps {
  children: React.ReactNode;
  notifications: AppNotification[];
  onMarkRead: (id?: string) => void;
  onRemoveNotif: (id: string) => void;
  businessInfo: BusinessInfo;
  currentUser: any;
  subscriptionExpired?: boolean;
  pendingActivations?: number;
  planHasAIAssistant?: boolean;
  hasModuleControl?: boolean;
  modulePermissions?: { moduleCode: string; granted: boolean }[];
  pointsProgramEnabled?: boolean;
  onActivateProduction?: () => Promise<void>;
}

const iconMap: Record<string, React.ReactNode> = {
  'Panel SaaS': <BuildingOffice2Icon className="w-6 h-6" />,
  'Panel Principal': <ChartBarIcon className="w-6 h-6" />,
  'Dashboard': <ChartBarIcon className="w-6 h-6" />,
  'Emisión': <DocumentTextIcon className="w-6 h-6" />,
  'Facturación SaaS': <DocumentTextIcon className="w-6 h-6" />,
  'Devoluciones': <ArrowUturnLeftIcon className="w-6 h-6" />,
  'NC SaaS': <ArrowUturnLeftIcon className="w-6 h-6" />,
  'Activaciones': <DevicePhoneMobileIcon className="w-6 h-6" />,
  'Planes': <CubeIcon className="w-6 h-6" />,
  'Contabilidad': <BookOpenIcon className="w-6 h-6" />,
  'Libro Ventas SaaS': <BookOpenIcon className="w-6 h-6" />,
  'Suscripción': <CreditCardIcon className="w-6 h-6" />,
  'Panel de Gestión': <UserGroupIcon className="w-6 h-6" />,
  'Notas de Crédito': <ArrowPathIcon className="w-6 h-6" />,
  'Retenciones': <BanknotesIcon className="w-6 h-6" />,
  'Guías de Remisión': <TruckIcon className="w-6 h-6" />,
  'Liquidaciones': <ClipboardDocumentListIcon className="w-6 h-6" />,
  'Reportes y SRI': <ChartBarIcon className="w-6 h-6" />,
  'Libro de Ventas': <BookOpenIcon className="w-6 h-6" />,
  'ATS': <DocumentIcon className="w-6 h-6" />,
  'Formulario 104': <BanknotesIcon className="w-6 h-6" />,
  'Kardex': <CubeIcon className="w-6 h-6" />,
  'Rentabilidad': <ChartBarIcon className="w-6 h-6" />,
  'Notificaciones': <EnvelopeIcon className="w-6 h-6" />,
  'Entidades': <UsersIcon className="w-6 h-6" />,
  'Inventario': <TagIcon className="w-6 h-6" />,
  'Integración Web': <LinkIcon className="w-6 h-6" />,
  'Perfil de Empresa': <BuildingOffice2Icon className="w-6 h-6" />,
  'Asistente IA': <SparklesIcon className="w-6 h-6" />,
  'Recetas': <BeakerIcon className="w-6 h-6" />,
  'Producción': <ClipboardDocumentCheckIcon className="w-6 h-6" />,
  'Caja': <TicketIcon className="w-6 h-6" />,
  'Pendientes SRI': <DocumentArrowUpIcon className="w-6 h-6" />,
  'Cerrar Sesión': <ArrowRightOnRectangleIcon className="w-6 h-6" />,
  'Landing Page': <GlobeAltIcon className="w-5 h-5" />,
  'Seguridad / Dispositivos': <ShieldExclamationIcon className="w-6 h-6" />,
  'Puntos': <TrophyIcon className="w-6 h-6" />,
  'Puntos SaaS': <TrophyIcon className="w-6 h-6" />,
  'Blog': <BookOpenIcon className="w-6 h-6" />,
  'Compras': <BookOpenIcon className="w-6 h-6" />,
  'Facturas': <DocumentTextIcon className="w-6 h-6" />,
  'Proformas': <DocumentTextIcon className="w-6 h-6" />,
  'Empresas': <BuildingOffice2Icon className="w-6 h-6" />,
};

const menuItemModuleMap: Record<string, string> = {
  'invoices': 'invoices', 'credit-notes': 'credit-notes', 'retentions': 'retentions',
  'remittances': 'remittances', 'settlements': 'settlements',
  'reports': 'reports', 'sales-book': 'reports', 'ats': 'reports', 'form-104': 'reports',
  'kardex': 'reports', 'profitability': 'reports', 'quicksale': 'caja', 'pending-sri': 'caja',
  'clients': 'clients', 'products': 'products', 'recipes': 'production', 'production': 'production',
  'config': 'config', 'integrations': 'integrations', 'ai-assistant': 'ai-assistant', 'audit': 'audit',
  'purchases': 'reports', 'security-points': 'reports',
};

interface MenuItem {
  id: string;
  label: string;
  roles: string[];
  businessTypes?: string[];
}

interface MenuGroup {
  id: string;
  label: string;
  roles: string[];
  items: MenuItem[];
}

const loadCollapsed = () => {
  try {
    const saved = localStorage.getItem('menuCollapsedGroups');
    if (saved) return JSON.parse(saved);
  } catch { /* ignorar */ }
  // Default: solo SUPERADMIN abierto
  return { superadmin: false };
};

const handleLogout = async () => {
  const sessionId = localStorage.getItem('sessionId');
  const token = localStorage.getItem('adminToken');
  if (sessionId && token) {
    try {
      await fetch(`${import.meta.env.VITE_BACKEND_URL || ''}/api/business/sessions/${sessionId}/revoke`, {
        method: 'PUT', headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (e) { /* ignorar */ }
  }
  localStorage.removeItem('adminToken'); localStorage.removeItem('adminUser');
  localStorage.removeItem('subscriptionExpired'); localStorage.removeItem('businessActive');
  localStorage.removeItem('hasModuleControl'); localStorage.removeItem('modulePermissions');
  localStorage.removeItem('sessionId'); localStorage.removeItem('refreshToken');
  window.location.reload();
};

const allGroups: MenuGroup[] = [
  {
    id: 'superadmin',
    label: 'SUPERADMIN',
    roles: ['SUPERADMIN'],
    items: [
      { id: 'saas-admin', label: 'Panel SaaS', roles: ['SUPERADMIN'] },
      { id: 'dashboard', label: 'Dashboard', roles: ['SUPERADMIN'] },
      { id: '_div_gestion', label: '──── Gestión ────', roles: ['SUPERADMIN'] },
      { id: 'activation-requests', label: 'Activaciones', roles: ['SUPERADMIN'] },
      { id: 'subscription-plans', label: 'Planes', roles: ['SUPERADMIN'] },
      { id: 'saas-payment-methods', label: 'Métodos de Pago', roles: ['SUPERADMIN'] },
      { id: '_div_contenido', label: '──── Contenido ────', roles: ['SUPERADMIN'] },
      { id: 'landing-editor', label: 'Landing Page', roles: ['SUPERADMIN'] },
      { id: 'blog-editor', label: 'Blog', roles: ['SUPERADMIN'] },
      { id: '_div_financiero', label: '──── Financiero ────', roles: ['SUPERADMIN'] },
      { id: 'subscription-invoices', label: 'Facturación SaaS', roles: ['SUPERADMIN'] },
      { id: 'saas-credit-notes', label: 'NC SaaS', roles: ['SUPERADMIN'] },
      { id: 'subscription-reports', label: 'Libro Ventas SaaS', roles: ['SUPERADMIN'] },
      { id: '_div_fidelidad', label: '──── Fidelidad ────', roles: ['SUPERADMIN'] },
      { id: 'points-admin', label: 'Puntos SaaS', roles: ['SUPERADMIN'] },
    ]
  },
  {
    id: 'emision',
    label: 'Emisión',
    roles: ['ADMIN', 'VENDEDOR', 'CONTADOR'],
    items: [
      { id: 'invoices', label: 'Facturas', roles: ['ADMIN', 'VENDEDOR', 'CONTADOR'] },
      { id: 'credit-notes', label: 'Notas de Crédito', roles: ['ADMIN', 'VENDEDOR', 'CONTADOR'] },
      { id: 'retentions', label: 'Retenciones', roles: ['ADMIN', 'CONTADOR'] },
      { id: 'remittances', label: 'Guías de Remisión', roles: ['ADMIN', 'VENDEDOR', 'CONTADOR'] },
      { id: 'settlements', label: 'Liquidaciones', roles: ['ADMIN', 'CONTADOR'] },
    ]
  },
  {
    id: 'operaciones',
    label: 'Operaciones',
    roles: ['ADMIN', 'VENDEDOR', 'CONTADOR'],
    items: [
      { id: 'quicksale', label: 'Caja', roles: ['ADMIN', 'VENDEDOR'], businessTypes: ['BAKERY', 'RESTAURANT'] },
      { id: 'pending-sri', label: 'Pendientes SRI', roles: ['ADMIN', 'VENDEDOR', 'CONTADOR'], businessTypes: ['BAKERY', 'RESTAURANT'] },
      { id: 'purchases', label: 'Compras', roles: ['ADMIN', 'CONTADOR'] },
    ]
  },
  {
    id: 'gestion',
    label: 'Gestión',
    roles: ['ADMIN', 'VENDEDOR', 'CONTADOR'],
    items: [
      { id: 'clients', label: 'Entidades', roles: ['ADMIN', 'VENDEDOR', 'CONTADOR'] },
      { id: 'products', label: 'Inventario', roles: ['ADMIN'] },
      { id: 'recipes', label: 'Recetas', roles: ['ADMIN'], businessTypes: ['BAKERY', 'RESTAURANT'] },
      { id: 'production', label: 'Producción', roles: ['ADMIN'], businessTypes: ['BAKERY', 'RESTAURANT'] },
    ]
  },
  {
    id: 'puntos',
    label: 'Puntos',
    roles: ['ADMIN', 'VENDEDOR', 'CONTADOR'],
    items: [
      { id: 'security-points', label: 'Puntos', roles: ['ADMIN', 'VENDEDOR', 'CONTADOR'] },
    ]
  },
  {
    id: 'reportes',
    label: 'Reportes',
    roles: ['ADMIN', 'CONTADOR'],
    items: [
      { id: 'reports', label: 'Reportes y SRI', roles: ['ADMIN', 'CONTADOR'] },
      { id: 'sales-book', label: 'Libro de Ventas', roles: ['ADMIN', 'CONTADOR'] },
      { id: 'ats', label: 'ATS', roles: ['ADMIN', 'CONTADOR'] },
      { id: 'form-104', label: 'Formulario 104', roles: ['ADMIN', 'CONTADOR'] },
      { id: 'kardex', label: 'Kardex', roles: ['ADMIN', 'CONTADOR'] },
      { id: 'profitability', label: 'Rentabilidad', roles: ['ADMIN', 'CONTADOR'] },
    ]
  },
  {
    id: 'configuracion',
    label: 'Configuración',
    roles: ['ADMIN', 'VENDEDOR', 'CONTADOR', 'SUPERADMIN'],
    items: [
      { id: 'config', label: 'Perfil de Empresa', roles: ['ADMIN', 'SUPERADMIN', 'VENDEDOR', 'CONTADOR'] },
      { id: 'pago-interno', label: 'Suscripción', roles: ['ADMIN'] },
      { id: 'company-users', label: 'Panel de Gestión', roles: ['ADMIN'] },
      { id: 'sessions', label: 'Seguridad / Dispositivos', roles: ['ADMIN', 'VENDEDOR', 'CONTADOR', 'SUPERADMIN'] },
      { id: 'notifications', label: 'Notificaciones', roles: ['ADMIN', 'VENDEDOR', 'CONTADOR', 'SUPERADMIN'] },
      { id: 'integrations', label: 'Integración Web', roles: ['ADMIN'] },
      { id: 'ai-assistant', label: 'Asistente IA', roles: ['ADMIN', 'SUPERADMIN'] },
    ]
  },
];

const groupIcons: Record<string, React.ReactNode> = {
  superadmin: <ShieldExclamationIcon className="w-3.5 h-3.5" />,
  emision: <DocumentTextIcon className="w-3.5 h-3.5" />,
  operaciones: <ShoppingCartIcon className="w-3.5 h-3.5" />,
  gestion: <UsersIcon className="w-3.5 h-3.5" />,
  puntos: <TrophyIcon className="w-3.5 h-3.5" />,
  reportes: <ChartBarIcon className="w-3.5 h-3.5" />,
  configuracion: <Cog6ToothIcon className="w-3.5 h-3.5" />,
};

const logoutItem: MenuItem = { id: 'logout_btn', label: 'Cerrar Sesión', roles: [] };

const Layout: React.FC<LayoutProps> = ({
  children, notifications, onMarkRead, onRemoveNotif,
  businessInfo, currentUser, subscriptionExpired = false, pendingActivations = 0,
  planHasAIAssistant = false, hasModuleControl = false, modulePermissions = [],
  pointsProgramEnabled = true, onActivateProduction
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = location.pathname.startsWith('/app/')
    ? location.pathname.split('/app/')[1]
    : 'dashboard';
  const [showNotifications, setShowNotifications] = useState(false);
  const [isEnvModalOpen, setIsEnvModalOpen] = useState(false);
  const [isEnvLoading, setIsEnvLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [landingLogo, setLandingLogo] = useState<string | null | false>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setLandingLogo('/api/settings/landing-logo');
    img.onerror = () => setLandingLogo(false);
    img.src = '/api/settings/landing-logo';
  }, []);
  const notificationRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(loadCollapsed);

  const toggleGroup = (groupId: string) => {
    const current = collapsedGroups[groupId];
    const next = { ...collapsedGroups, [groupId]: current === undefined ? true : !current };
    setCollapsedGroups(next);
    try { localStorage.setItem('menuCollapsedGroups', JSON.stringify(next)); } catch { /* */ }
  };

  const handleTabClick = (tabId: string) => {
    if (tabId === 'logout_btn') { handleLogout(); return; }
    navigate('/app/' + tabId);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const handleConfirmProduction = async () => {
    setIsEnvLoading(true);
    try { await onActivateProduction?.(); }
    finally { setIsEnvModalOpen(false); setIsEnvLoading(false); }
  };

  const emp = businessInfo as any;

  // ================================================================
  // DEFINICIÓN DE GRUPOS DE MENÚ (con roles para filtrar grupos)
  // ================================================================
  const isSuperAdmin = currentUser?.role === 'SUPERADMIN';
  const isAdmin = currentUser?.role === 'ADMIN';

  // Filtrar ítems por role, tipo de negocio, suscripción, módulos, plan
  const filterItem = (item: MenuItem): boolean => {
    if (!item.roles.includes(currentUser?.role)) return false;
    if (subscriptionExpired && item.id !== 'pago-interno' && item.id !== 'logout_btn') return false;
    if (item.id === 'ai-assistant' && !planHasAIAssistant) return false;
    if (item.id === 'security-points' && !pointsProgramEnabled && !isSuperAdmin) return false;
    if (item.businessTypes && !item.businessTypes.includes(emp?.businessType)) return false;
    if (item.id === 'pago-interno' && !isAdmin) return false;
    if (item.id === 'products' && !isAdmin) return false;

    // Módulos: empleados sin ADMIN/SUPERADMIN
    if (hasModuleControl && currentUser?.role !== 'ADMIN' && currentUser?.role !== 'SUPERADMIN') {
      const moduleCode = menuItemModuleMap[item.id];
      if (moduleCode) {
        const perm = modulePermissions.find(p => p.moduleCode === moduleCode);
        if (!perm || !perm.granted) return false;
      }
    }
    return true;
  };

  // Filtrar grupos que tengan al menos un ítem visible
  const visibleGroups = allGroups.filter(group => {
    if (!group.roles.includes(currentUser?.role)) return false;
    // El grupo SUPERADMIN solo se muestra si hay al menos un item visible
    if (group.id === 'superadmin' && !isSuperAdmin) return false;
    const visibleItems = group.items.filter(filterItem);
    return visibleItems.length > 0;
  });

  // Dashboard: SUPERADMIN lo ve en grupo SUPERADMIN; usuarios normales lo ven al inicio siempre
  const showStandaloneDashboard = !isSuperAdmin;

  return (
    <div className="flex h-screen bg-[#F6F6F7] dark:bg-[#0F172A] overflow-hidden relative transition-colors duration-300">
      <EnvironmentModal
        isOpen={isEnvModalOpen} onClose={() => setIsEnvModalOpen(false)}
        onConfirm={handleConfirmProduction} loading={isEnvLoading}
      />

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[990] lg:hidden"
          role="presentation"
          onClick={() => setIsSidebarOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsSidebarOpen(false);
            }
          }}
        />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 w-72 sm:w-80 md:w-72
        bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200
        flex flex-col shadow-xl dark:shadow-2xl dark:shadow-black/30
        border-r border-slate-200 dark:border-slate-700/50
        z-[1000] transform transition-all duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/50 flex justify-between items-center">
          <div className="min-w-0 flex-1">
            <div className="py-2">
              {landingLogo ? (
                <img src={landingLogo} className="h-16 w-auto max-w-full object-contain object-left dark:brightness-0 dark:invert" alt="Logo" />
              ) : landingLogo === false && emp?.logo ? (
                <img src={emp.logo} className="h-16 w-auto max-w-full object-contain object-left" alt="Logo" />
              ) : null}
              <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1.5 uppercase font-bold tracking-widest">Enterprise Edition</p>
            </div>
          </div>
          <button type="button" onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-slate-700 dark:hover:text-white p-2 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {!isSuperAdmin && (
          <div className="px-4 mt-4">
            {emp?.isProduction ? (
              <div className="w-full flex items-center justify-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 py-3 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
                <ShieldExclamationIcon className="w-5 h-5" />
                <span className="font-black text-xs uppercase tracking-widest">Ambiente Producción</span>
              </div>
            ) : (
              <button type="button" onClick={() => setIsEnvModalOpen(true)}
                className="w-full flex items-center justify-between bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-xl shadow-lg shadow-red-500/20 transition-colors group">
                <div className="flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-5 h-5 animate-pulse" />
                  <span className="font-black text-xs uppercase tracking-widest">Ambiente Pruebas</span>
                </div>
                <ChevronDownIcon className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
          </div>
        )}

        <nav className="flex-1 p-2 sm:p-4 mt-2 space-y-1 overflow-y-auto">
          {/* Standalone Dashboard for non-SUPERADMIN */}
          {showStandaloneDashboard && (
            <button type="button"
              onClick={() => handleTabClick('dashboard')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 min-h-[48px] text-left border-l-4 group mb-3 ${
                activeTab === 'dashboard'
                  ? 'bg-sky-50 border-sky-500 text-sky-700 font-bold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-sky-50/50 hover:text-sky-600 hover:translate-x-1 dark:hover:bg-sky-500/10 font-semibold'
              }`}
            >
              <span className="flex-shrink-0"><ChartBarIcon className="w-6 h-6" /></span>
              <span className="text-sm font-medium flex-1">Dashboard</span>
            </button>
          )}

          {/* Grupos colapsables */}
          {visibleGroups.map(group => {
            const visibleItems = group.items.filter(filterItem);
            const isCollapsed = collapsedGroups[group.id] !== false;
            const hasActiveTab = visibleItems.some(item => item.id === activeTab);
            const groupBadge = group.id === 'superadmin' ? pendingActivations : 0;

            return (
              <div key={group.id} className="mb-1">
                <button type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleGroup(group.id); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer select-none ${
                    hasActiveTab ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  <span className="flex-shrink-0">{groupIcons[group.id]}</span>
                  <span className="flex-1 text-left">{group.label}</span>
                  {groupBadge > 0 && isCollapsed && (
                    <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{groupBadge}</span>
                  )}
                  <ChevronDownIcon className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${!isCollapsed ? 'rotate-180' : ''}`} />
                </button>

                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isCollapsed ? 'max-h-0 opacity-0 pointer-events-none' : 'max-h-[2000px] opacity-100'}`}>
                  <div className="space-y-0.5 mt-1">
                      {visibleItems.map(item => (
                        item.id.startsWith('_div_') ? (
                          <div key={item.id} className="px-4 py-1.5 text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em] select-none pointer-events-none">{item.label.replace(/─/g, '')}</div>
                        ) : (
                        <button type="button"
                          key={item.id}
                          onClick={() => handleTabClick(item.id)}
                        className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-200 min-h-[44px] text-left border-l-4 group ${
                          activeTab === item.id
                            ? 'bg-sky-50 border-sky-500 text-sky-700 font-bold'
                            : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-sky-50/50 hover:text-sky-600 hover:translate-x-1 dark:hover:bg-sky-500/10 font-semibold'
                        }`}
                      >
                        <span className="flex-shrink-0 scale-90">{iconMap[item.label] || <CubeIcon className="w-5 h-5" />}</span>
                        <span className="text-xs font-medium flex-1">{item.label}</span>
                        {item.id === 'activation-requests' && pendingActivations > 0 && (
                          <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                            {pendingActivations}
                          </span>
                        )}
                       </button>
                        )
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Cerrar Sesión */}
          <button type="button"
            onClick={() => handleTabClick('logout_btn')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 min-h-[48px] text-left border-l-4 mt-4 border-transparent text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/20 hover:text-red-600 dark:hover:text-red-300 font-bold`}
          >
            <span className="flex-shrink-0"><ArrowRightOnRectangleIcon className="w-6 h-6" /></span>
            <span className="text-sm font-medium flex-1">Cerrar Sesión</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700/50">
          <div className="flex items-center space-x-3 bg-slate-100 dark:bg-slate-900/50 p-3 rounded-xl transition-colors">
            <div className="w-9 h-9 rounded-lg bg-sky-500 flex items-center justify-center font-bold text-white shadow-lg shadow-sky-500/20 overflow-hidden">
              {emp?.logo ? (
                <img src={emp.logo} className="w-full h-full object-cover" alt="Logo" />
              ) : (
                <span>{emp?.name ? emp.name.charAt(0) : 'E'}</span>
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold truncate text-slate-800 dark:text-slate-200">{emp?.name || 'Mi Negocio'}</p>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-mono truncate">RUC: {emp?.ruc || 'Sin configurar'}</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden w-full">
        <header className="h-14 sm:h-16 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700/50 flex items-center justify-between px-3 sm:px-4 lg:px-8 z-40 print:hidden transition-colors duration-300">
          <div className="flex items-center gap-2 sm:gap-4">
            <button type="button" onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all print:hidden min-w-[44px] min-h-[44px] flex items-center justify-center">
              <Bars3Icon className="w-6 h-6" />
            </button>
            <h2 className="text-[10px] sm:text-xs lg:text-sm font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 truncate print:hidden max-w-[120px] sm:max-w-[200px] lg:max-w-none">
              {(() => {
                const activeItem = visibleGroups.flatMap(g => g.items).find(i => i.id === activeTab);
                if (!activeItem) return activeTab === 'dashboard' ? 'Dashboard' : '';
                const activeGroup = visibleGroups.find(g => g.items.some(i => i.id === activeTab));
                if (activeGroup && !activeItem.id.startsWith('_div_')) {
                  return <>{activeGroup.label} <span className="text-sky-500 dark:text-sky-400 mx-1">›</span> {activeItem.label}</>;
                }
                return activeItem.label;
              })()}
            </h2>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4 print:hidden">
            <div className="relative" ref={notificationRef}>
              <button type="button" onClick={() => setShowNotifications(!showNotifications)}
                className={`relative p-2 rounded-xl transition-all min-w-[44px] min-h-[44px] flex items-center justify-center ${
                  showNotifications ? 'bg-sky-100 dark:bg-sky-500/20 text-sky-500 dark:text-sky-400' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}>
                <BellIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 border-2 border-white dark:border-slate-800 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-[280px] sm:w-72 lg:w-80 max-w-[calc(100vw-24px)] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600/50 rounded-2xl shadow-2xl dark:shadow-black/40 z-50 overflow-hidden animate-scale-in origin-top-right max-h-[80vh]">
                  <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-tighter text-slate-800 dark:text-white">Notificaciones</span>
                    <button type="button" onClick={() => onMarkRead()} className="text-[10px] font-bold text-sky-500 dark:text-sky-400 px-2 py-1 min-h-[32px] hover:underline">
                      Marcar todas leídas
                    </button>
                  </div>
                  <div className="max-h-60 sm:max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-300 dark:text-slate-600 italic text-xs">Sin novedades</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`p-4 flex gap-3 group relative ${!n.read ? 'bg-sky-50/30 dark:bg-sky-500/5' : ''}`}>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${n.type === 'success' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-sky-100 dark:bg-sky-500/10 text-sky-500 dark:text-sky-400'}`}>
                            <div className="w-2 h-2 rounded-full bg-current" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs ${n.read ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white font-bold'}`}>{n.text}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-2 sm:p-4 lg:p-8 bg-[#F6F6F7]/50 dark:bg-[#0F172A]/50 transition-colors duration-300">
          {subscriptionExpired && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
                  <span className="text-red-600 dark:text-red-400 text-lg">!</span>
                </div>
                <div>
                  <h3 className="font-bold text-red-800 dark:text-red-300">Suscripción Vencida</h3>
                  <p className="text-sm text-red-600 dark:text-red-400">Su suscripción ha vencido. Renueve para acceder a todas las funciones.</p>
                </div>
              </div>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
