import React, { useState, useRef, useEffect } from 'react';
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
} from '@heroicons/react/24/outline';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  notifications: AppNotification[];
  onMarkRead: (id?: string) => void;
  onRemoveNotif: (id: string) => void;
  businessInfo: BusinessInfo;
  currentUser: any;
  subscriptionExpired?: boolean;
  pendingActivations?: number;
  planHasAIAssistant?: boolean;
}

const iconMap: Record<string, React.ReactNode> = {
  'Panel SaaS': <BuildingOffice2Icon className="w-6 h-6" />,
  'Panel Principal': <ChartBarIcon className="w-6 h-6" />,
  'Emisión': <DocumentTextIcon className="w-6 h-6" />,
  'Devoluciones': <ArrowUturnLeftIcon className="w-6 h-6" />,
  'Activaciones': <DevicePhoneMobileIcon className="w-6 h-6" />,
  'Planes': <CubeIcon className="w-6 h-6" />,
  'Contabilidad': <BookOpenIcon className="w-6 h-6" />,
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
};

const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  setActiveTab,
  notifications,
  onMarkRead,
  onRemoveNotif,
  businessInfo,
  currentUser,
  subscriptionExpired = false,
  pendingActivations = 0,
  planHasAIAssistant = false
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('subscriptionExpired');
    localStorage.removeItem('businessActive');
    window.location.reload();
  };

  const allMenuItems = [
    { id: 'saas-admin', label: 'Panel SaaS', roles: ['SUPERADMIN'] },
    { id: 'dashboard', label: 'Panel Principal', roles: ['ADMIN', 'VENDEDOR', 'CONTADOR', 'SUPERADMIN'] },
    { id: 'subscription-invoices', label: 'Emisión', roles: ['SUPERADMIN'] },
    { id: 'saas-credit-notes', label: 'Devoluciones', roles: ['SUPERADMIN'] },
    { id: 'activation-requests', label: 'Activaciones', roles: ['SUPERADMIN'] },
    { id: 'subscription-plans', label: 'Planes', roles: ['SUPERADMIN'] },
    { id: 'subscription-reports', label: 'Contabilidad', roles: ['SUPERADMIN'] },
    { id: 'pago-interno', label: 'Suscripción', roles: ['ADMIN'] },
    { id: 'company-users', label: 'Panel de Gestión', roles: ['ADMIN'] },
    { id: 'invoices', label: 'Emisión', roles: ['ADMIN', 'VENDEDOR', 'CONTADOR'] },
    { id: 'quicksale', label: 'Caja', roles: ['ADMIN', 'VENDEDOR'], businessTypes: ['BAKERY', 'RESTAURANT'] },
    { id: 'pending-sri', label: 'Pendientes SRI', roles: ['ADMIN', 'VENDEDOR', 'CONTADOR'], businessTypes: ['BAKERY', 'RESTAURANT'] },
    { id: 'credit-notes', label: 'Notas de Crédito', roles: ['ADMIN', 'VENDEDOR', 'CONTADOR'] },
    { id: 'retentions', label: 'Retenciones', roles: ['ADMIN', 'CONTADOR'] },
    { id: 'remittances', label: 'Guías de Remisión', roles: ['ADMIN', 'VENDEDOR', 'CONTADOR'] },
    { id: 'settlements', label: 'Liquidaciones', roles: ['ADMIN', 'CONTADOR'] },
    { id: 'reports', label: 'Reportes y SRI', roles: ['ADMIN', 'CONTADOR'] },
    { id: 'sales-book', label: 'Libro de Ventas', roles: ['ADMIN', 'CONTADOR'] },
    { id: 'ats', label: 'ATS', roles: ['ADMIN', 'CONTADOR'] },
    { id: 'form-104', label: 'Formulario 104', roles: ['ADMIN', 'CONTADOR'] },
    { id: 'kardex', label: 'Kardex', roles: ['ADMIN', 'CONTADOR'] },
    { id: 'profitability', label: 'Rentabilidad', roles: ['ADMIN', 'CONTADOR'] },
    { id: 'recipes', label: 'Recetas', roles: ['ADMIN'], businessTypes: ['BAKERY', 'RESTAURANT'] },
    { id: 'production', label: 'Producción', roles: ['ADMIN'], businessTypes: ['BAKERY', 'RESTAURANT'] },
    { id: 'notifications', label: 'Notificaciones', roles: ['ADMIN', 'VENDEDOR', 'CONTADOR', 'SUPERADMIN'] },
    { id: 'clients', label: 'Entidades', roles: ['ADMIN', 'VENDEDOR', 'CONTADOR'] },
    { id: 'products', label: 'Inventario', roles: ['ADMIN'] },
    { id: 'integrations', label: 'Integración Web', roles: ['ADMIN'] },
    { id: 'config', label: 'Perfil de Empresa', roles: ['ADMIN', 'SUPERADMIN', 'VENDEDOR', 'CONTADOR'] },
    { id: 'ai-assistant', label: 'Asistente IA', roles: ['ADMIN', 'SUPERADMIN'] },
    { id: 'logout_btn', label: 'Cerrar Sesión', roles: ['ADMIN', 'VENDEDOR', 'CONTADOR', 'SUPERADMIN', 'CLIENT'] },
  ];

  const menuItems = allMenuItems.filter(item => {
    if (subscriptionExpired && item.id !== 'pago-interno' && item.id !== 'logout_btn') {
      return false;
    }
    const hasRole = !item.roles || (currentUser && item.roles.includes(currentUser.role));
    if (!hasRole) return false;
    const userBusinessType = currentUser?.businessType || 'GENERAL';
    if (item.businessTypes && !item.businessTypes.includes(userBusinessType)) {
      return false;
    }
    if (item.id === 'ai-assistant' && !planHasAIAssistant) {
      return false;
    }
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTabClick = (id: string) => {
    if (id === 'logout_btn') {
      handleLogout();
    } else {
      setActiveTab(id);
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#F6F6F7] dark:bg-[#0F172A] overflow-hidden relative transition-colors duration-300">

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[990] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 w-72 sm:w-80 md:w-72
        bg-white dark:bg-slate-800
        text-slate-800 dark:text-slate-200
        flex flex-col shadow-xl dark:shadow-2xl dark:shadow-black/30
        border-r border-slate-200 dark:border-slate-700/50
        z-[1000] transform transition-all duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/50 flex justify-between items-center">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-700 rounded-lg flex items-center justify-center">
                <DocumentTextIcon className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-800 dark:text-white">
                ECUAFACT <span className="text-indigo-700 dark:text-indigo-400">PRO</span>
              </h1>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 uppercase font-bold tracking-widest">Enterprise Edition</p>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-slate-700 dark:hover:text-white p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-2 sm:p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3.5 sm:py-4 rounded-xl transition-all min-h-[48px] sm:min-h-[52px] text-left ${
                activeTab === item.id
                  ? 'bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-700/20'
                  : item.id === 'logout_btn'
                    ? 'text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/20 hover:text-red-600 dark:hover:text-red-300 mt-4 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white font-semibold'
              }`}
            >
              <span className="flex-shrink-0">{iconMap[item.label] || <CubeIcon className="w-6 h-6" />}</span>
              <span className="text-sm sm:text-base font-medium flex-1">{item.label}</span>
              {item.id === 'activation-requests' && pendingActivations > 0 && (
                <span className="bg-red-500 text-white text-xs font-black px-2 py-0.5 rounded-full min-w-[22px] text-center">
                  {pendingActivations}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700/50">
          <div className="flex items-center space-x-3 bg-slate-100 dark:bg-slate-900/50 p-3 rounded-xl transition-colors">
            <div className="w-9 h-9 rounded-lg bg-indigo-700 dark:bg-indigo-500 flex items-center justify-center font-bold text-white shadow-sm overflow-hidden">
              {businessInfo.logo ? (
                <img src={businessInfo.logo} className="w-full h-full object-cover" alt="Logo" />
              ) : (
                <span>{businessInfo.name ? businessInfo.name.charAt(0) : 'E'}</span>
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold truncate text-slate-800 dark:text-slate-200">{businessInfo.name || 'Mi Negocio'}</p>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-mono truncate">RUC: {businessInfo.ruc || 'Sin configurar'}</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden w-full">
        <header className="h-14 sm:h-16 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700/50 flex items-center justify-between px-3 sm:px-4 lg:px-8 z-10 print:hidden transition-colors duration-300">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all print:hidden min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <Bars3Icon className="w-6 h-6" />
            </button>
            <h2 className="text-[10px] sm:text-xs lg:text-sm font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 truncate print:hidden max-w-[120px] sm:max-w-[200px] lg:max-w-none">
              {menuItems.find(i => i.id === activeTab)?.label}
            </h2>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4 print:hidden">
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`relative p-2 rounded-xl transition-all min-w-[44px] min-h-[44px] flex items-center justify-center ${
                  showNotifications
                    ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400'
                    : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <BellIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 border-2 border-white dark:border-slate-800 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-[280px] sm:w-72 lg:w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600/50 rounded-2xl shadow-2xl dark:shadow-black/40 z-50 overflow-hidden animate-scale-in origin-top-right max-h-[80vh]">
                  <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-tighter text-slate-800 dark:text-white">Notificaciones</span>
                    <button onClick={() => onMarkRead()} className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 px-2 py-1 min-h-[32px] hover:underline">
                      Marcar todas leídas
                    </button>
                  </div>
                  <div className="max-h-60 sm:max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-300 dark:text-slate-600 italic text-xs">Sin novedades</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`p-4 flex gap-3 group relative ${!n.read ? 'bg-indigo-50/30 dark:bg-indigo-500/5' : ''}`}>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            n.type === 'success'
                              ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400'
                          }`}>
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
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Su suscripción ha vencido. Renueve para acceder a todas las funciones.
                  </p>
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
