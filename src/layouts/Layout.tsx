import React, { useState, useRef, useEffect } from 'react';
import { AppNotification, BusinessInfo } from '../types/types';

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
}

const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  setActiveTab,
  notifications,
  onMarkRead,
  onRemoveNotif,
  businessInfo,
  currentUser,
  subscriptionExpired = false
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // --- FUNCIÓN PARA CERRAR SESIÓN ---
  const handleLogout = () => {
    localStorage.removeItem('adminToken'); // Borra el token de admin
    localStorage.removeItem('adminUser');  // Borra el usuario de admin
    localStorage.removeItem('subscriptionExpired'); // Borra el flag de suscripción
    localStorage.removeItem('businessActive'); // Borra el flag de empresa activa
    window.location.reload();         // Recarga la página para que App.tsx detecte que no hay token
  };

  const allMenuItems = [
    // Menú Exclusivo Superadmin
    { id: 'saas-admin', label: 'Panel SaaS', icon: '🏢', roles: ['SUPERADMIN'] },


    // Menú General
    { id: 'dashboard', label: 'Panel Principal', icon: '📊', roles: ['ADMIN', 'VENDEDOR', 'CONTADOR', 'SUPERADMIN'] },
    { id: 'subscription-invoices', label: 'Emisión', icon: '🧾', roles: ['SUPERADMIN'] },
    { id: 'saas-credit-notes', label: 'Devoluciones', icon: '🔙', roles: ['SUPERADMIN'] },
    { id: 'activation-requests', label: 'Activaciones', icon: '📱', roles: ['SUPERADMIN'] },
    { id: 'subscription-plans', label: 'Planes', icon: '📦', roles: ['SUPERADMIN'] },
    { id: 'subscription-reports', label: 'Contabilidad', icon: '📒', roles: ['SUPERADMIN'] },
    { id: 'pago-interno', label: 'Suscripción', icon: '💳', roles: ['ADMIN'] },

    // Menú Admin Empresa - Gestión Global
    { id: 'company-users', label: 'Panel de Gestión', icon: '👔', roles: ['ADMIN'] },


    // Menú Operativo (Solo Empresas)
    { id: 'invoices', label: 'Emisión', icon: '📄', roles: ['ADMIN', 'VENDEDOR'] },
    { id: 'credit-notes', label: 'Notas de Crédito', icon: '🔄', roles: ['ADMIN', 'VENDEDOR'] },
    { id: 'retentions', label: 'Retenciones', icon: '💰', roles: ['ADMIN'] },
    { id: 'remittances', label: 'Guías de Remisión', icon: '🚚', roles: ['ADMIN'] },
    { id: 'settlements', label: 'Liquidaciones', icon: '📑', roles: ['ADMIN'] },
    { id: 'reports', label: 'Reportes y SRI', icon: '📈', roles: ['ADMIN'] },
    { id: 'sales-book', label: 'Libro de Ventas', icon: '📚', roles: ['ADMIN'] },
    { id: 'ats', label: 'ATS', icon: '📄', roles: ['ADMIN'] },
    { id: 'form-104', label: 'Formulario 104', icon: '💰', roles: ['ADMIN'] },
    { id: 'kardex', label: 'Kardex', icon: '📦', roles: ['ADMIN'] },
    { id: 'profitability', label: 'Rentabilidad', icon: '📈', roles: ['ADMIN'] },

    // Común
    { id: 'notifications', label: 'Notificaciones', icon: '📧', roles: ['ADMIN', 'VENDEDOR', 'CONTADOR', 'SUPERADMIN'] },

    // Operativo
    { id: 'clients', label: 'Entidades', icon: '👥', roles: ['ADMIN', 'VENDEDOR', 'CONTADOR'] },
    { id: 'products', label: 'Inventario', icon: '🏷️', roles: ['ADMIN'] },
    { id: 'integrations', label: 'Integración Web', icon: '🔌', roles: ['ADMIN'] },

    // Configuración
    { id: 'config', label: 'Perfil de Empresa', icon: '🏢', roles: ['ADMIN', 'SUPERADMIN', 'VENDEDOR', 'CONTADOR'] },
    { id: 'ai-assistant', label: 'Asistente IA', icon: '🤖', roles: ['ADMIN', 'SUPERADMIN'] },

    { id: 'logout_btn', label: 'Cerrar Sesión', icon: '🚪', roles: ['ADMIN', 'VENDEDOR', 'CONTADOR', 'SUPERADMIN', 'CLIENT'] },
  ];

  // Filtrar menú según el rol del usuario
  // Si la suscripción está vencida, solo mostrar opción de pago y cierre de sesión
  const menuItems = allMenuItems.filter(item => {
    // Si la suscripción está vencida, solo permitir 'pago-interno' y 'logout_btn'
    if (subscriptionExpired && item.id !== 'pago-interno' && item.id !== 'logout_btn') {
      return false;
    }
    return !item.roles || (currentUser && item.roles.includes(currentUser.role));
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

  // --- MANEJADOR DE CLICS DEL MENÚ ---
  const handleTabClick = (id: string) => {
    if (id === 'logout_btn') {
      // Si el ID es el botón de salir, ejecutamos logout
      handleLogout();
    } else {
      // Si no, cambiamos de pestaña normalmente
      setActiveTab(id);
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0f172a] overflow-hidden relative transition-colors duration-300">

      {/* OVERLAY PARA MÓVIL */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR RESPONSIVE */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 w-72 sm:w-80 md:w-72
        bg-white dark:bg-[#1e293b]
        text-slate-800 dark:text-slate-200
        flex flex-col shadow-xl dark:shadow-2xl dark:shadow-black/30
        border-r border-slate-200 dark:border-slate-700/50
        z-50 transform transition-all duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700/50 flex justify-between items-center">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-black tracking-tighter text-blue-600 dark:text-blue-400">ECUAFACT <span className="text-slate-800 dark:text-white">PRO</span></h1>
            <p className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 sm:mt-1 uppercase font-black tracking-widest">Enterprise Edition</p>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-700 dark:hover:text-white p-2 min-w-[44px] min-h-[44px] flex items-center justify-center">
            ✕
          </button>
        </div>

        <nav className="flex-1 p-2 sm:p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3.5 sm:py-4 rounded-2xl transition-all min-h-[48px] sm:min-h-[52px] text-left ${activeTab === item.id
                ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/20 dark:shadow-blue-500/10'
                : item.id === 'logout_btn'
                  ? 'text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-300 mt-4 border border-transparent hover:border-red-200 dark:hover:border-red-500/20'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-800 dark:hover:text-white'
                }`}
            >
              <span className="text-xl sm:text-2xl">{item.icon}</span>
              <span className="text-sm sm:text-base">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700/50">
          <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-600/30">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-slate-700 flex items-center justify-center font-black text-blue-600 dark:text-white shadow-sm overflow-hidden border border-blue-200 dark:border-slate-600">
              {businessInfo.logo ? (
                <img src={businessInfo.logo} className="w-full h-full object-cover" alt="Logo" />
              ) : (
                <span>{businessInfo.name ? businessInfo.name.charAt(0) : 'E'}</span>
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate text-slate-800 dark:text-slate-200">{businessInfo.name || 'Mi Negocio'}</p>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-mono truncate">RUC: {businessInfo.ruc || 'Sin configurar'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col overflow-hidden w-full">
        <header className="h-14 sm:h-16 bg-white/80 dark:bg-[#1e293b]/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700/50 flex items-center justify-between px-3 sm:px-4 lg:px-8 z-10 print:hidden transition-colors duration-300">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all print:hidden min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
            <h2 className="text-[9px] sm:text-[10px] lg:text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 truncate print:hidden max-w-[120px] sm:max-w-[200px] lg:max-w-none">
              {menuItems.find(i => i.id === activeTab)?.label}
            </h2>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4 print:hidden">
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`relative p-2 rounded-xl transition-all min-w-[44px] min-h-[44px] flex items-center justify-center ${showNotifications ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 border-2 border-white dark:border-slate-800 rounded-full text-[9px] text-white flex items-center justify-center font-bold">{unreadCount}</span>}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-[280px] sm:w-72 lg:w-80 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-600/50 rounded-3xl shadow-2xl dark:shadow-black/40 z-50 overflow-hidden animate-in zoom-in-95 duration-200 origin-top-right max-h-[80vh]">
                  <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center">
                    <span className="text-xs font-black uppercase tracking-tighter text-slate-800 dark:text-white">Notificaciones</span>
                    <button onClick={() => onMarkRead()} className="text-[10px] font-bold text-blue-600 dark:text-blue-400 px-2 py-1 min-h-[32px]">Leído</button>
                  </div>
                  <div className="max-h-60 sm:max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-300 dark:text-slate-600 italic text-xs">Sin novedades</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`p-4 flex gap-3 group relative ${!n.read ? 'bg-blue-50/30 dark:bg-blue-500/5' : ''}`}>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${n.type === 'success' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'}`}>
                            <span className="text-sm">●</span>
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

        <div className="flex-1 overflow-y-auto p-2 sm:p-4 lg:p-8 bg-slate-50/50 dark:bg-[#0f172a]/50 transition-colors duration-300">
          {/* Banner de suscripción vencida */}
          {subscriptionExpired && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-red-600 dark:text-red-400">warning</span>
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
