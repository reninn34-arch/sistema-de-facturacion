import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from './context/AppContext';
import Layout from './layouts/Layout';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import renderConfigContent from './renderers/renderConfigContent';
import Login from './modules/autenticacion/pages/Login';
import ClientLogin from './modules/autenticacion/pages/ClientLogin';
import ClientDashboard from './modules/clientes/pages/ClientDashboard';
import ResetPassword from './modules/autenticacion/pages/ResetPassword';
import VerifyEmail from './modules/autenticacion/pages/VerifyEmail';
import SubscriptionPage from './modules/saas/pages/SubscriptionPage';
import LandingPage from './modules/landing/pages/LandingPage';
import AyudaPage from './modules/landing/pages/AyudaPage';
import ContactoPage from './modules/landing/pages/ContactoPage';
import LegalPage from './modules/landing/pages/LegalPage';
import BlogPage from './modules/landing/pages/BlogPage';

const Dashboard = React.lazy(() => import('./modules/saas/components/Dashboard'));
const InvoiceForm = React.lazy(() => import('./modules/facturacion/components/InvoiceForm'));
const CreditNoteForm = React.lazy(() => import('./modules/facturacion/components/CreditNoteForm'));
const RetentionForm = React.lazy(() => import('./modules/facturacion/components/RetentionForm'));
const RemittanceForm = React.lazy(() => import('./modules/facturacion/components/RemittanceForm'));
const SettlementForm = React.lazy(() => import('./modules/facturacion/components/SettlementForm'));
const SalesBook = React.lazy(() => import('./modules/reportes/components/SalesBook'));
const ATSReport = React.lazy(() => import('./modules/reportes/components/ATSReport'));
const Form104 = React.lazy(() => import('./modules/reportes/components/Form104'));
const Kardex = React.lazy(() => import('./modules/facturacion/components/Kardex'));
const ProfitabilityAnalysis = React.lazy(() => import('./modules/reportes/components/ProfitabilityAnalysis'));
const NotificationSettingsComponent = React.lazy(() => import('./modules/configuracion/components/NotificationSettings'));
const AIAssistant = React.lazy(() => import('./modules/saas/components/AIAssistant'));
const ClientManager = React.lazy(() => import('./modules/clientes/components/ClientManager'));
const ProductManager = React.lazy(() => import('./modules/clientes/components/ProductManager'));
const Reports = React.lazy(() => import('./modules/reportes/components/Reports'));
const Integrations = React.lazy(() => import('./modules/configuracion/components/Integrations'));
const SaasAdmin = React.lazy(() => import('./modules/saas/pages/SaasAdmin'));
const SaasEmission = React.lazy(() => import('./modules/saas/pages/SaasEmission'));
const SubscriptionPlansManager = React.lazy(() => import('./modules/saas/pages/SubscriptionPlansManager'));
const SaasCreditNote = React.lazy(() => import('./modules/saas/pages/SaasCreditNote'));
const SalesSummary = React.lazy(() => import('./modules/saas/pages/SalesSummary'));
const PagoInterno = React.lazy(() => import('./modules/saas/pages/SubscriptionPayment'));
const ActivationRequests = React.lazy(() => import('./modules/admin/pages/ActivationRequests'));
const LandingPageEditor = React.lazy(() => import('./modules/admin/pages/LandingPageEditor'));
const BlogEditor = React.lazy(() => import('./modules/admin/pages/BlogEditor'));
const RecipeManager = React.lazy(() => import('./modules/produccion/components/RecipeManager'));
const ProductionRecord = React.lazy(() => import('./modules/produccion/components/ProductionRecord'));
const QuickSaleForm = React.lazy(() => import('./modules/caja/pages/QuickSaleForm'));
const PendingTickets = React.lazy(() => import('./modules/caja/pages/PendingTickets'));
const SessionsPage = React.lazy(() => import('./modules/admin/pages/SessionsPage'));
const SecurityPoints = React.lazy(() => import('./modules/saas/pages/SecurityPoints'));
const PointsAdmin = React.lazy(() => import('./modules/admin/pages/PointsAdmin'));
const PurchaseManager = React.lazy(() => import('./modules/compras/components/PurchaseManager'));
const UserManagement = React.lazy(() => import('./modules/admin/pages/UserManagement'));

const AppRoot: React.FC = () => {
  const { isAuthenticated } = useAppContext();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to="/app/dashboard" replace />;
};

const RootRoute: React.FC = () => {
  const { isAuthenticated } = useAppContext();
  if (isAuthenticated) return <Navigate to="/app/dashboard" replace />;
  return <LandingPage />;
};

const LoginRoute: React.FC = () => {
  const { setIsAuthenticated, setHasModuleControl, setModulePermissions, isAuthenticated } = useAppContext();
  if (isAuthenticated) return <Navigate to="/app" replace />;
  return (
    <Login onLoginSuccess={() => {
      setIsAuthenticated(true);
      setHasModuleControl(JSON.parse(localStorage.getItem('hasModuleControl') || 'false'));
      setModulePermissions(JSON.parse(localStorage.getItem('modulePermissions') || '[]'));
    }} />
  );
};

const CatchAllRoute: React.FC = () => {
  const { isAuthenticated } = useAppContext();
  return <Navigate to={isAuthenticated ? "/app/dashboard" : "/login"} replace />;
};

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAppContext();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AppShell: React.FC = () => {
  const ctx = useAppContext();
  const { tab } = useParams<{ tab: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (tab && tab !== ctx.activeTab) {
      ctx.setActiveTab(tab);
    }
  }, [tab]);

  useEffect(() => {
    const pathPrefix = '/app/';
    const path = window.location.pathname;
    if (path.startsWith(pathPrefix)) {
      const pathTab = path.slice(pathPrefix.length);
      if (pathTab !== ctx.activeTab) {
        navigate(`/app/${ctx.activeTab}`, { replace: true });
      }
    }
  }, [ctx.activeTab]);
  const {
    activeTab, setActiveTab, notifications, businessInfo, currentUser, subscriptionExpired,
    pendingActivationCount, currentPlanHasAI, currentPlanHasAudit, currentPlanDurationDays,
    currentPlanMaxInvoices, currentPlanMaxEmissionPoints, pointsProgramEnabled,
    preloadRejectedDoc, reportsFilter, setReportsFilter, hasModuleControl, modulePermissions,
    clients, setClients, documents, setDocuments, products, setProducts,
    emissionPoints, selectedEmissionPoint, setSelectedEmissionPoint,
    signatureFile, signatureBuffer, signaturePassword,
    notificationSettings, quicksales, setQuicksales, isDemoMode, showNotify,
    handleDocumentAuthorized, handleActivateProduction, toggleDarkMode,
    saveBusinessField, saveBusinessConfig, handleUpdateProfile, handleChangePassword,
    handleSignatureFileChange, handleSaveNotificationSettings,
    personalEmail, passwordData, showProfilePassword, showSignaturePassword,
    setBusinessInfo, setPersonalEmail, setPasswordData, setShowProfilePassword,
    setSignatureFile, setSignatureBuffer, setSignaturePassword: setSigPwd,
    setShowSignaturePassword, setEmissionPoints,
    logoInputRef,
  } = ctx;

  const renderContent = () => {
    const isAdminRole = currentUser?.role === 'ADMIN' || currentUser?.role === 'VENDEDOR' || currentUser?.role === 'CONTADOR';

    if (isAdminRole && subscriptionExpired && activeTab !== 'pago-interno') {
      return (
        <PagoInterno
          businessInfo={{
            id: (businessInfo as any).id || '',
            name: businessInfo.name || '',
            ruc: businessInfo.ruc || '',
            email: businessInfo.email || '',
            plan: (businessInfo as any).plan || 'FREE',
            subscriptionEnd: businessInfo.subscriptionEnd || null,
            isActive: (businessInfo as any).isActive ?? true
          }}
          isExpired={true}
          onPaymentComplete={async () => {
            ctx.setSubscriptionExpired(false);
            ctx.setSubscriptionPending(false);
            setActiveTab('dashboard');
            localStorage.setItem('subscriptionExpired', 'false');
            localStorage.setItem('subscriptionPending', 'false');
            try {
              const token = localStorage.getItem('adminToken');
              const API_URL = import.meta.env.VITE_BACKEND_URL || '';
              const response = await fetch(`${API_URL}/api/business`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (response.ok) {
                const data = await response.json();
                setBusinessInfo(data);
              }
            } catch (error) {
              console.error('Error recargando empresa:', error);
            }
          }}
          onBack={() => {}}
          onNotify={showNotify}
        />
      );
    }

    const effectiveBusinessInfo = {
      ...businessInfo,
      establishmentCode: selectedEmissionPoint?.establishmentCode || businessInfo.establishmentCode || '001',
      emissionPointCode: selectedEmissionPoint?.emissionPointCode || businessInfo.emissionPointCode || '001',
    };

    switch (activeTab) {
      case 'pago-interno':
        return (
          <PagoInterno
            businessInfo={{
              id: (businessInfo as any).id || '',
              name: businessInfo.name || '',
              ruc: businessInfo.ruc || '',
              email: businessInfo.email || '',
              plan: (businessInfo as any).plan || 'FREE',
              subscriptionEnd: businessInfo.subscriptionEnd || null,
              isActive: (businessInfo as any).isActive ?? true
            }}
            isExpired={subscriptionExpired}
            onPaymentComplete={() => {
              ctx.setSubscriptionExpired(false);
              ctx.setSubscriptionPending(false);
              localStorage.setItem('subscriptionExpired', 'false');
              localStorage.setItem('subscriptionPending', 'false');
              setActiveTab('dashboard');
            }}
            onBack={() => setActiveTab('dashboard')}
            onNotify={showNotify}
          />
        );

      case 'dashboard':
        return (
          <div className="space-y-6">
            {currentUser?.role === 'ADMIN' && <SalesSummary documents={documents} />}
            <Dashboard documents={documents} products={products} setActiveTab={setActiveTab} currentUser={currentUser} businessInfo={businessInfo} planHasAudit={currentPlanHasAudit || currentUser?.role === 'SUPERADMIN'} planDurationDays={currentPlanDurationDays} planMaxInvoices={currentPlanMaxInvoices} hasModuleControl={hasModuleControl} modulePermissions={modulePermissions} pointsProgramEnabled={pointsProgramEnabled} onSetReportsFilter={setReportsFilter} />
          </div>
        );

      case 'invoices': return <InvoiceForm clients={clients} setClients={setClients} isDemoMode={isDemoMode} products={products} businessInfo={effectiveBusinessInfo} signatureFile={signatureFile} signaturePassword={signaturePassword} notificationSettings={notificationSettings} onNotify={showNotify} onAuthorize={handleDocumentAuthorized} emissionPoints={emissionPoints} selectedEmissionPoint={selectedEmissionPoint} onSelectEmissionPoint={setSelectedEmissionPoint} preloadRejected={preloadRejectedDoc} onClearPreload={() => ctx.setPreloadRejectedDoc(null)} />;
      case 'credit-notes': return (
        <CreditNoteForm
          clients={clients} products={products} invoices={documents} businessInfo={effectiveBusinessInfo}
          signatureOptions={signatureBuffer && signaturePassword ? { p12File: signatureBuffer, password: signaturePassword, claveAcceso: '' } : null}
          onDocumentCreated={handleDocumentAuthorized}
        />
      );
      case 'retentions': return <RetentionForm business={effectiveBusinessInfo} clients={clients} onSubmit={() => showNotify('Retención generada exitosamente')} />;
      case 'remittances': return <RemittanceForm business={effectiveBusinessInfo} clients={clients} products={products} onSubmit={() => showNotify('Guía de remisión generada exitosamente')} />;
      case 'settlements': return <SettlementForm business={effectiveBusinessInfo} clients={clients} products={products} onSubmit={() => showNotify('Liquidación generada exitosamente')} />;
      case 'sales-book': return <SalesBook documents={documents} business={businessInfo} onNotify={showNotify} />;
      case 'ats': return <ATSReport documents={documents} business={businessInfo} onNotify={showNotify} />;
      case 'form-104': return <Form104 documents={documents} business={businessInfo} onNotify={showNotify} />;
      case 'kardex': return <Kardex products={products} documents={documents} onNotify={showNotify} />;
      case 'profitability': return <ProfitabilityAnalysis products={products} documents={documents} onNotify={showNotify} />;
      case 'notifications': return <NotificationSettingsComponent settings={notificationSettings} onSave={handleSaveNotificationSettings} onNotify={showNotify} />;
      case 'reports': return <Reports documents={documents} businessInfo={businessInfo} onConvertProforma={() => { setActiveTab('invoices'); showNotify('Cree una nueva factura con los datos de la proforma', 'success'); }} setActiveTab={setActiveTab} initialFilter={reportsFilter} onFilterChange={setReportsFilter} onReemitDocument={(doc) => { ctx.setPreloadRejectedDoc(doc); setReportsFilter('ALL'); setActiveTab('invoices'); }} />;
      case 'purchases': return (
        <PurchaseManager clients={clients} businessInfo={businessInfo} purchases={documents} onNotify={showNotify}
          onPurchaseAdded={(doc) => setDocuments(prev => [doc, ...prev])}
          onPurchaseDeleted={(id) => { setDocuments(prev => prev.filter(d => d.id !== id)); showNotify('Comprobante eliminado'); }}
          isDemoMode={isDemoMode}
        />
      );
      case 'ai-assistant':
        if (!currentPlanHasAI && currentUser?.role !== 'SUPERADMIN') {
          showNotify('El Asistente IA requiere un plan superior. Actualice su suscripción.', 'warning');
          return <Dashboard documents={documents} products={products} setActiveTab={setActiveTab} currentUser={currentUser} />;
        }
        return <AIAssistant businessInfo={businessInfo} />;

      case 'saas-admin':
        if (currentUser?.role !== 'SUPERADMIN') {
          showNotify('Acceso restringido. Solo el Superadministrador puede acceder a esta sección.', 'error');
          return <Dashboard documents={documents} products={products} setActiveTab={setActiveTab} currentUser={currentUser} />;
        }
        return <SaasAdmin onNotify={showNotify} />;

      case 'subscription-invoices':
      case 'subscription-sri-invoice':
        if (currentUser?.role !== 'SUPERADMIN') {
          showNotify('Acceso restringido', 'error');
          return <Dashboard documents={documents} products={products} setActiveTab={setActiveTab} currentUser={currentUser} />;
        }
        return <SaasEmission businesses={ctx.businesses} onNotify={showNotify} />;

      case 'subscription-plans':
        if (currentUser?.role !== 'SUPERADMIN') {
          showNotify('Acceso restringido', 'error');
          return <Dashboard documents={documents} products={products} setActiveTab={setActiveTab} currentUser={currentUser} />;
        }
        return <SubscriptionPlansManager onNotify={showNotify} />;

      case 'points-admin':
        if (currentUser?.role !== 'SUPERADMIN') {
          showNotify('Acceso restringido', 'error');
          return <Dashboard documents={documents} products={products} setActiveTab={setActiveTab} currentUser={currentUser} />;
        }
        return <PointsAdmin />;

      case 'blog-editor':
        if (currentUser?.role !== 'SUPERADMIN') {
          showNotify('Acceso restringido', 'error');
          return <Dashboard documents={documents} products={products} setActiveTab={setActiveTab} currentUser={currentUser} />;
        }
        return <BlogEditor />;

      case 'activation-requests':
        if (currentUser?.role !== 'SUPERADMIN') {
          showNotify('Acceso restringido', 'error');
          return <Dashboard documents={documents} products={products} setActiveTab={setActiveTab} currentUser={currentUser} />;
        }
        return <ActivationRequests onNotify={showNotify} />;

      case 'landing-editor':
        if (currentUser?.role !== 'SUPERADMIN') {
          showNotify('Acceso restringido', 'error');
          return <Dashboard documents={documents} products={products} setActiveTab={setActiveTab} currentUser={currentUser} />;
        }
        return <LandingPageEditor />;

      case 'saas-credit-notes':
        if (currentUser?.role !== 'SUPERADMIN') {
          showNotify('Acceso restringido', 'error');
          return <Dashboard documents={documents} products={products} setActiveTab={setActiveTab} currentUser={currentUser} />;
        }
        return <SaasCreditNote businesses={ctx.businesses} documents={documents} onNotify={showNotify} />;

      case 'subscription-reports':
        if (currentUser?.role !== 'SUPERADMIN') {
          showNotify('Acceso restringido', 'error');
          return <Dashboard documents={documents} products={products} setActiveTab={setActiveTab} currentUser={currentUser} />;
        }
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Contabilidad del SaaS</h2>
            <SalesBook documents={documents} business={businessInfo} onNotify={showNotify} />
          </div>
        );

      case 'admin-subscriptions':
      case 'admin-users':
        if (currentUser?.role !== 'SUPERADMIN') {
          showNotify('Acceso restringido', 'error');
          return <Dashboard documents={documents} products={products} setActiveTab={setActiveTab} currentUser={currentUser} />;
        }
        return <SaasAdmin onNotify={showNotify} />;

      case 'company-users':
        if (currentUser?.role !== 'ADMIN') {
          showNotify('Acceso restringido', 'error');
          return <Dashboard documents={documents} products={products} setActiveTab={setActiveTab} />;
        }
        return <UserManagement currentUser={currentUser} onNotify={showNotify} />;

      case 'sessions':
        return <SessionsPage currentUser={currentUser} onNotify={showNotify} />;

      case 'user-management':
        showNotify('Acceso no disponible', 'error');
        return <Dashboard documents={documents} products={products} setActiveTab={setActiveTab} currentUser={currentUser} />;

      case 'clients': return <ClientManager clients={clients} setClients={setClients} onNotify={showNotify} isDemoMode={isDemoMode} currentUser={currentUser} />;
      case 'products': return <ProductManager products={products} setProducts={setProducts} onNotify={showNotify} isDemoMode={isDemoMode} businessType={businessInfo?.businessType as any} isProduction={businessInfo?.isProduction || false} />;
      case 'security-points': return <SecurityPoints businessInfo={businessInfo} isDemoMode={isDemoMode} onNotify={showNotify} />;
      case 'recipes': return <RecipeManager products={products} onNotify={showNotify} />;
      case 'production': return <ProductionRecord products={products} setProducts={setProducts} onNotify={showNotify} />;
      case 'quicksale': return <QuickSaleForm products={products} clients={clients} setClients={setClients} businessInfo={businessInfo} onNotify={showNotify} onTicketCreated={(ticket) => setQuicksales(prev => [ticket, ...prev])} />;
      case 'pending-sri': return <PendingTickets tickets={quicksales} setTickets={setQuicksales} products={products} businessInfo={effectiveBusinessInfo} signatureFile={signatureFile} signaturePassword={signaturePassword} onNotify={showNotify} onAuthorize={handleDocumentAuthorized} />;
      case 'integrations': return <Integrations products={products} clients={clients} businessInfo={businessInfo} onOrderAuthorized={handleDocumentAuthorized} onNotify={showNotify} onUpdateProducts={setProducts} />;
      case 'config':
        return renderConfigContent({
          businessInfo, personalEmail, passwordData, showProfilePassword,
          signatureFile, signaturePassword, showSignaturePassword,
          emissionPoints, selectedEmissionPoint, currentPlanMaxEmissionPoints,
          currentUser,
          setBusinessInfo, setPersonalEmail, setPasswordData, setShowProfilePassword,
          setSignatureFile, setSignatureBuffer, setSignaturePassword: setSigPwd, setShowSignaturePassword,
          setEmissionPoints, setSelectedEmissionPoint,
          handleUpdateProfile, handleChangePassword, toggleDarkMode,
          showNotify, saveBusinessField, saveBusinessConfig,
          handleSignatureFileChange, logoInputRef: logoInputRef as any,
        });
      default: return <Dashboard documents={documents} products={products} setActiveTab={setActiveTab} />;
    }
  };

  const ctxToasts = ctx.toasts;

  return (
    <Layout
      notifications={notifications}
      businessInfo={businessInfo}
      onMarkRead={() => ctx.setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
      onRemoveNotif={(id) => ctx.setNotifications(prev => prev.filter(n => n.id !== id))}
      currentUser={currentUser}
      subscriptionExpired={subscriptionExpired}
      pendingActivations={pendingActivationCount}
      planHasAIAssistant={currentPlanHasAI || currentUser?.role === 'SUPERADMIN'}
      hasModuleControl={hasModuleControl}
      modulePermissions={modulePermissions}
      pointsProgramEnabled={pointsProgramEnabled}
      onActivateProduction={handleActivateProduction}
    >
      <Suspense fallback={<div className="flex items-center justify-center h-full min-h-[400px]"><div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" /></div>}>
        {renderContent()}
      </Suspense>

      {currentUser?.role === 'SUPERADMIN' && (
        <div className="fixed top-5 right-24 z-[90] flex items-center gap-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-slate-200 dark:border-slate-600/50 transition-colors duration-300">
          <button
            onClick={toggleDarkMode}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-sky-500 dark:hover:text-sky-400 transition-colors"
          >
            {((businessInfo as any).features?.isDarkMode ?? false) ? (
              <><SunIcon className="w-4 h-4" /> Claro</>
            ) : (
              <><MoonIcon className="w-4 h-4" /> Oscuro</>
            )}
          </button>
        </div>
      )}
      <div className="fixed bottom-6 right-6 z-[999] flex flex-col gap-3 pointer-events-none">
        {ctxToasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto min-w-[320px] p-6 rounded-[2.5rem] shadow-2xl backdrop-blur-xl border animate-in slide-in-from-right-10 flex items-start gap-4 text-slate-950 dark:text-white"
            style={{
              backgroundColor: `${businessInfo.themeColor}EE`,
              borderColor: `${businessInfo.themeColor}44`
            }}
          >
            <span className="text-2xl">{toast.type === 'success' ? '✅' : 'ℹ️'}</span>
            <p className="font-black text-sm leading-tight mt-1">{toast.text}</p>
          </div>
        ))}
      </div>
    </Layout>
  );
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Root redirects authenticated users to /app, shows landing for anonymous */}
      <Route path="/" element={<RootRoute />} />
      <Route path="/inicio" element={<Navigate to="/" replace />} />
      <Route path="/ayuda" element={<AyudaPage />} />
      <Route path="/contacto" element={<ContactoPage />} />
      <Route path="/legal" element={<LegalPage />} />
      <Route path="/blog" element={<BlogPage />} />

      {/* Auth pages */}
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/reset-password" element={<ResetPassword type="admin" />} />
      <Route path="/portal/reset-password" element={<ResetPassword type="client" />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/portal/login" element={<ClientLogin />} />
      <Route path="/portal/dashboard" element={<ClientDashboard />} />
      <Route path="/suscripcion" element={<SubscriptionPage />} />

      {/* Protected app routes */}
      <Route path="/app" element={<AppRoot />} />
      <Route path="/app/:tab" element={<PrivateRoute><AppShell /></PrivateRoute>} />

      {/* Catch-all: authenticated → AppShell, not authenticated → Login (preserves URL) */}
      <Route path="*" element={<CatchAllRoute />} />
    </Routes>
  );
};
