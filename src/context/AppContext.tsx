import React, { useState, useEffect, useCallback, useMemo, useRef, createContext, useContext } from 'react';
import { Client, Product, AppNotification, Document, BusinessInfo, InvoiceItem, NotificationSettings, EmissionPoint } from '../types/types';
import { MOCK_CLIENTS, MOCK_PRODUCTS } from '../constants';
import { client } from '../api/client';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

interface Business {
  id: string;
  name: string;
  ruc: string;
  email: string;
  subscriptionEnd: string | null;
  isActive: boolean;
  plan: string;
}

interface AppContextType {
  isAuthenticated: boolean;
  setIsAuthenticated: (v: boolean) => void;
  activeTab: string;
  setActiveTab: (v: string) => void;
  selectedBusinessId: string | null;
  setSelectedBusinessId: (v: string | null) => void;
  isDemoMode: boolean;
  setIsDemoMode: (v: boolean) => void;
  businesses: Business[];
  setBusinesses: (v: Business[]) => void;
  loadingBusinesses: boolean;
  setLoadingBusinesses: (v: boolean) => void;
  currentUser: any;
  setCurrentUser: (v: any) => void;
  subscriptionExpired: boolean;
  setSubscriptionExpired: (v: boolean) => void;
  subscriptionPending: boolean;
  setSubscriptionPending: (v: boolean) => void;
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  documents: Document[];
  setDocuments: React.Dispatch<React.SetStateAction<Document[]>>;
  quicksales: any[];
  setQuicksales: React.Dispatch<React.SetStateAction<any[]>>;
  pendingActivationCount: number;
  setPendingActivationCount: (v: number) => void;
  businessInfo: BusinessInfo;
  setBusinessInfo: React.Dispatch<React.SetStateAction<BusinessInfo>>;
  emissionPoints: EmissionPoint[];
  setEmissionPoints: React.Dispatch<React.SetStateAction<EmissionPoint[]>>;
  selectedEmissionPoint: EmissionPoint | null;
  setSelectedEmissionPoint: React.Dispatch<React.SetStateAction<EmissionPoint | null>>;
  signatureFile: File | null;
  setSignatureFile: (v: File | null) => void;
  signatureBuffer: ArrayBuffer | null;
  setSignatureBuffer: (v: ArrayBuffer | null) => void;
  signaturePassword: string;
  setSignaturePassword: (v: string) => void;
  notificationSettings: NotificationSettings;
  setNotificationSettings: (v: NotificationSettings) => void;
  notifications: AppNotification[];
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
  toasts: AppNotification[];
  setToasts: React.Dispatch<React.SetStateAction<AppNotification[]>>;
  currentPlanHasAI: boolean;
  setCurrentPlanHasAI: (v: boolean) => void;
  currentPlanHasAudit: boolean;
  setCurrentPlanHasAudit: (v: boolean) => void;
  currentPlanDurationDays: number;
  setCurrentPlanDurationDays: (v: number) => void;
  currentPlanMaxInvoices: number;
  setCurrentPlanMaxInvoices: (v: number) => void;
  currentPlanMaxEmissionPoints: number;
  setCurrentPlanMaxEmissionPoints: (v: number) => void;
  pointsProgramEnabled: boolean;
  setPointsProgramEnabled: (v: boolean) => void;
  preloadRejectedDoc: Document | null;
  setPreloadRejectedDoc: (v: Document | null) => void;
  reportsFilter: string;
  setReportsFilter: (v: string) => void;
  hasModuleControl: boolean;
  setHasModuleControl: (v: boolean) => void;
  modulePermissions: { moduleCode: string; granted: boolean }[];
  setModulePermissions: (v: { moduleCode: string; granted: boolean }[]) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  logoInputRef: React.RefObject<HTMLInputElement>;
  showNotify: (text: string, type?: AppNotification['type']) => void;
  handleDocumentAuthorized: (doc: Document, items?: InvoiceItem[]) => Promise<void>;
  handleActivateProduction: () => Promise<void>;
  toggleDarkMode: () => Promise<void>;
  toggleDemoMode: () => Promise<void>;
  saveBusinessConfig: () => Promise<void>;
  saveBusinessField: (data: Record<string, any>, silent?: boolean) => Promise<void>;
  handleSaveNotificationSettings: (settings: NotificationSettings) => Promise<void>;
  handleSignatureFileChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('adminToken'));
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loadingBusinesses, setLoadingBusinesses] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const userStr = localStorage.getItem('adminUser');
    return userStr ? JSON.parse(userStr) : null;
  });
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);
  const [subscriptionPending, setSubscriptionPending] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [quicksales, setQuicksales] = useState<any[]>([]);
  const [pendingActivationCount, setPendingActivationCount] = useState(0);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    name: '', tradename: '', ruc: '', address: '', branchAddress: '', phone: '', email: '',
    category: 'RETAIL', regime: 'GENERAL', isAccountingObliged: false, isProduction: false,
    themeColor: '#0EA5E9', establishmentCode: '001', emissionPointCode: '001', taxpayerType: 'PERSONA_NATURAL',
  });
  const [emissionPoints, setEmissionPoints] = useState<EmissionPoint[]>([]);
  const [selectedEmissionPoint, setSelectedEmissionPoint] = useState<EmissionPoint | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signatureBuffer, setSignatureBuffer] = useState<ArrayBuffer | null>(null);
  const [signaturePassword, setSignaturePassword] = useState('');
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailEnabled: false, smsEnabled: false, whatsappEnabled: false,
    paymentRemindersEnabled: false, reminderDaysBefore: [3, 7, 15],
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([
    { id: '1', text: 'Bienvenido al sistema Azul', type: 'info', time: new Date(), read: false },
  ]);
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  const [currentPlanHasAI, setCurrentPlanHasAI] = useState(false);
  const [currentPlanHasAudit, setCurrentPlanHasAudit] = useState(false);
  const [currentPlanDurationDays, setCurrentPlanDurationDays] = useState(30);
  const [currentPlanMaxInvoices, setCurrentPlanMaxInvoices] = useState(999999);
  const [currentPlanMaxEmissionPoints, setCurrentPlanMaxEmissionPoints] = useState(1);
  const [pointsProgramEnabled, setPointsProgramEnabled] = useState(false);
  const [preloadRejectedDoc, setPreloadRejectedDoc] = useState<Document | null>(null);
  const [reportsFilter, setReportsFilter] = useState<string>('ALL');
  const [hasModuleControl, setHasModuleControl] = useState(() => {
    const stored = localStorage.getItem('hasModuleControl');
    return stored ? JSON.parse(stored) : false;
  });
  const [modulePermissions, setModulePermissions] = useState<{ moduleCode: string; granted: boolean }[]>(() => {
    const stored = localStorage.getItem('modulePermissions');
    return stored ? JSON.parse(stored) : [];
  });

  const showNotify = useCallback((text: string, type: AppNotification['type'] = 'success') => {
    const newNotif: AppNotification = {
      id: Math.random().toString(36).substr(2, 9), text, type, time: new Date(), read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
    setToasts(prev => [...prev, newNotif]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== newNotif.id)), 4000);
  }, []);

  useEffect(() => {
    const userStr = localStorage.getItem('adminUser');
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (currentUser?.requirePasswordChange && activeTab !== 'config') {
      setActiveTab('config');
      showNotify('Por seguridad, debe actualizar su contraseña para continuar.', 'warning');
    }
  }, [currentUser, activeTab, showNotify]);

  const isDarkMode = businessInfo.features?.isDarkMode ?? false;
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  const currentPlanCode = businessInfo.plan;
  useEffect(() => {
    const loadPlanFeatures = async () => {
      const plan = currentPlanCode;
      if (!plan) return;

      const defaultLimits: Record<string, number> = { FREE: 10, BASIC: 100, GASTRONOMICO: 300, PRO: 500, ENTERPRISE: 2000, MONTHLY: 100, SEMIANNUAL: 100, YEARLY: 100 };
      const fallbackLimit = defaultLimits[plan] !== undefined ? defaultLimits[plan] : 999999;

      try {
        const API_URL = import.meta.env.VITE_BACKEND_URL || '';
        const token = localStorage.getItem('adminToken');
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(`${API_URL}/api/subscription-plans`, { headers });
        if (response.ok) {
          const data = await response.json();
          const plans = data.plans || [];
          const currentPlan = plans.find((p: any) => p.code === plan);
          if (currentPlan) {
            setCurrentPlanHasAI(!!currentPlan.hasAIAssistant);
            setCurrentPlanHasAudit(!!currentPlan.hasAudit);
            setCurrentPlanDurationDays(currentPlan.durationDays ?? 30);
            setCurrentPlanMaxInvoices(currentPlan.maxInvoicesPerMonth ?? fallbackLimit);
            setCurrentPlanMaxEmissionPoints(currentPlan.maxEmissionPoints ?? 1);
            return;
          }
        }
      } catch (error) {
      }

      setCurrentPlanMaxInvoices(fallbackLimit);
    };
    loadPlanFeatures();
  }, [currentPlanCode]);

  useEffect(() => {
    const loadBusinesses = async () => {
      if (currentUser?.role !== 'SUPERADMIN') return;
      if (businesses.length > 0) return;

      setLoadingBusinesses(true);
      try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_URL}/api/admin/businesses`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setBusinesses(data);
        }
      } catch (error) {
        console.error('Error cargando empresas:', error);
      } finally {
        setLoadingBusinesses(false);
      }
    };
    loadBusinesses();
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.role !== 'SUPERADMIN') return;

    const fetchPendingCount = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_URL}/api/activation-requests?status=PENDING`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setPendingActivationCount(Array.isArray(data) ? data.length : (data.requests?.length || 0));
        }
      } catch (error) {
      }
    };

    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 60000);
    return () => clearInterval(interval);
  }, [currentUser, activeTab]);

  useEffect(() => {
    const loadBusinessesOnTabChange = async () => {
      if (activeTab !== 'subscription-invoices' && activeTab !== 'subscription-sri-invoice' && activeTab !== 'saas-credit-notes') return;
      if (currentUser?.role !== 'SUPERADMIN') return;

      setLoadingBusinesses(true);
      try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_URL}/api/admin/businesses`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setBusinesses(data);
        }
      } catch (error) {
        console.error('Error recargando empresas:', error);
      } finally {
        setLoadingBusinesses(false);
      }
    };
    loadBusinessesOnTabChange();
  }, [activeTab, currentUser]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;
    const loadData = async () => {
      const backendIsDemo = (await client.get<{ isDemo: boolean }>('/api/business/demo').catch(() => ({ data: { isDemo: false } })) as any).data?.isDemo || false;
      if (cancelled) return;
      const useDemoMode = isDemoMode || backendIsDemo;

      if (useDemoMode) {
        console.log("🔶 MODO DEMO ACTIVADO: Usando datos locales");
        setClients(MOCK_CLIENTS);
        setProducts(MOCK_PRODUCTS);
        setDocuments([]);
        setBusinessInfo(prev => ({
          ...prev,
          name: prev.name || 'EMPRESA DEMO',
          ruc: prev.ruc || '1799999999001',
          address: prev.address || 'Modo Demostración',
          isDemo: true
        } as any));
        return;
      }

      try {
        const loadBusiness = client.get<{ data: BusinessInfo }>('/api/business').then(r => r.data).catch(e => { console.error("Error loading business", e); return null; });
        const loadClients = client.get<{ data: Client[] }>('/api/clients').then(r => r.data).catch(e => { console.error("Error loading clients", e); return []; });
        const loadProducts = client.get<{ data: Product[] }>('/api/products').then(r => r.data).catch(e => { console.error("Error loading products", e); return []; });
        const loadDocs = client.get<{ data: Document[] }>('/api/documents').then(r => r.data).catch(e => { console.error("Error loading documents", e); return []; });
        const loadEmissionPoints = client.get<EmissionPoint[]>('/api/emission-points').then(r => r.data).catch(e => { console.error("Error loading emission points", e); return [] as EmissionPoint[]; });
        const loadPointsConfig = client.get<{ programEnabled: boolean }>('/api/referrals/code').then(r => r.data).catch(() => ({ programEnabled: false }));

        const [empresa, clientes, productos, docs, epoints, pointsCfg] = await Promise.all([loadBusiness, loadClients, loadProducts, loadDocs, loadEmissionPoints, loadPointsConfig]);
        if (cancelled) return;

        if (empresa) {
          setBusinessInfo(empresa as BusinessInfo);

          if (currentUser?.role !== 'SUPERADMIN') {
            const now = new Date();
            const subscriptionEnd = empresa.subscriptionEnd ? new Date(empresa.subscriptionEnd) : null;
            const isExpired = subscriptionEnd && subscriptionEnd < now;
            const isNotActive = (empresa as any).isActive === false;
            const isPending = (empresa as any).subscriptionStatus === 'PENDING';

            setSubscriptionPending(isPending);

            if (isExpired || isNotActive || isPending) {
              setSubscriptionExpired(true);
              setActiveTab('pago-interno');
              console.log('⚠️ Suscripción vencida o pendiente. Acceso bloqueado.');
            }
          }
        }
        setClients(clientes || []);
        setProducts(productos || []);
        setDocuments(docs || []);
        setEmissionPoints(epoints || []);
        if (epoints && epoints.length > 0) setSelectedEmissionPoint(epoints[0]);
        setPointsProgramEnabled(pointsCfg?.programEnabled !== false);

        const features = empresa?.features || {};
        if (features.signatureP12) {
          try {
            const byteCharacters = atob(features.signatureP12);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/x-pkcs12' });
            const file = new File([blob], "firma_digital.p12", { type: 'application/x-pkcs12' });
            setSignatureFile(file);
            setSignatureBuffer(byteArray.buffer);
            if (features.signaturePassword) {
              setSignaturePassword(features.signaturePassword);
            }
          } catch (e) {
            console.error("Error restaurando firma:", e);
          }
        }
      } catch (error) {
        console.error("❌ Error conectando a DB:", error);
        showNotify("Error de conexión con el servidor. Revise su internet.", "error");
      }
    };

    loadData();
    return () => { cancelled = true; };
  }, [isAuthenticated, isDemoMode]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let lastCheck = 0;
    const MIN_CHECK_INTERVAL = 60000;

    const checkSession = async () => {
      const now = Date.now();
      if (now - lastCheck < MIN_CHECK_INTERVAL) return;
      lastCheck = now;

      try {
        const token = localStorage.getItem('adminToken');
        if (!token) return;

        const response = await fetch(`${API_URL}/api/business/sessions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.status === 401) {
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminUser');
          window.location.href = '/login';
          return;
        }
        if (!response.ok) return;

        const data = await response.json();
        const mySession = data.sessions?.find((s: any) => s.id === data.currentSessionId);
        if (mySession && mySession.status !== 'ACTIVE') {
          const reason = mySession.status === 'REVOKED'
            ? 'Tu sesión fue cerrada por el administrador'
            : 'Tu sesión ha expirado';
          showNotify(reason, 'warning');
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminUser');
          localStorage.removeItem('hasModuleControl');
          localStorage.removeItem('modulePermissions');
          localStorage.removeItem('sessionId');
          window.location.href = '/login';
        }
      } catch (e) { /* silencioso */ }
    };

    const onVisible = () => { if (document.visibilityState === 'visible') checkSession(); };
    document.addEventListener('visibilitychange', onVisible);

    const onActivity = () => checkSession();
    document.addEventListener('click', onActivity, { passive: true });
    document.addEventListener('keydown', onActivity, { passive: true });

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      document.removeEventListener('click', onActivity);
      document.removeEventListener('keydown', onActivity);
    };
  }, [isAuthenticated]);

  const handleDocumentAuthorized = useCallback(async (doc: Document, items?: InvoiceItem[]) => {
    if (isDemoMode) {
      setDocuments(prev => [doc, ...prev]);
      if (items) {
        setProducts(prev => prev.map(p => {
          const item = items.find(i => i.productId === p.id);
          if (item) return { ...p, stock: Math.max(0, p.stock - item.quantity) };
          return p;
        }));
      }
      showNotify("Documento autorizado (Modo Demo - Local)", "success");
      return;
    }

    if (!signatureFile && businessInfo.isProduction) {
      showNotify("Firma requerida para producción", "error");
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...doc, items })
      });

      if (!response.ok) throw new Error('Error guardando en BD');
      const savedDoc = await response.json();

      setDocuments(prev => [savedDoc, ...prev]);

      if (items) {
        const prodRes = await fetch(`${API_URL}/api/products`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (prodRes.ok) setProducts(await prodRes.json());
      }

      showNotify("Documento autorizado y guardado en base de datos", "success");
    } catch (error) {
      console.error(error);
      setDocuments(prev => [doc, ...prev]);
      if (items) {
        setProducts(prev => prev.map(p => {
          const item = items.find(i => i.productId === p.id);
          if (item) return { ...p, stock: Math.max(0, p.stock - item.quantity) };
          return p;
        }));
      }
      showNotify("Documento autorizado (Guardado localmente por error de BD)", "warning");
    }
  }, [isDemoMode, signatureFile, businessInfo.isProduction, showNotify]);

  const handleActivateProduction = useCallback(async () => {
    if (!signatureFile) {
      showNotify("Debes configurar una firma electrónica (.p12) antes de pasar a Producción", "error");
      throw new Error("No signature");
    }

    try {
      const response = await client.post('/api/business/production');

      setBusinessInfo(prev => ({ ...prev, isProduction: true }));
      setDocuments([]);

      showNotify('Ambiente de Producción activado. Comprobantes de prueba eliminados.', 'success');
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || 'Error al cambiar a producción';
      showNotify(msg, 'error');
      throw error;
    }
  }, [signatureFile, showNotify]);

  const toggleDarkMode = useCallback(async () => {
    const currentFeatures = businessInfo.features || {};
    const newIsDark = !(currentFeatures.isDarkMode ?? false);

    const updatedFeatures = {
      ...currentFeatures,
      isDarkMode: newIsDark
    };

    setBusinessInfo(prev => ({ ...prev, features: updatedFeatures }));

    showNotify(newIsDark ? "Modo oscuro activado 🌙" : "Modo claro activado ☀️");

    try {
      const token = localStorage.getItem('adminToken');
      await fetch(`${API_URL}/api/business`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ features: updatedFeatures })
      });
    } catch (error) {
      console.error("Error guardando preferencia de tema", error);
    }
  }, [businessInfo.features, showNotify]);

  const toggleDemoMode = useCallback(async () => {
    const currentIsDemo = businessInfo.isDemo || false;
    const newIsDemo = !currentIsDemo;

    if (newIsDemo) {
      const currentFeatures = businessInfo.features || {};
      if (currentFeatures.signatureP12) {
        showNotify("No puedes activar el modo demo porque ya tienes una firma digital. Primero elimina la firma digital.", "error");
        return;
      }
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/business/demo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ enable: newIsDemo })
      });

      const data = await response.json();

      if (response.ok) {
        setBusinessInfo(prev => ({ ...prev, isDemo: newIsDemo }));
        setIsDemoMode(newIsDemo);
        showNotify(data.message || (newIsDemo ? "Modo demo activado 🎮" : "Modo demo desactivado"));
      } else {
        showNotify(data.message || "Error al cambiar modo demo", "error");
      }
    } catch (error) {
      console.error("Error toggling demo mode", error);
      showNotify("Error al cambiar modo demo", "error");
    }
  }, [businessInfo.isDemo, businessInfo.features, showNotify]);

  const saveBusinessConfig = useCallback(async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const { id, ...dataToSave } = businessInfo as any;
      const response = await fetch(`${API_URL}/api/business`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dataToSave)
      });

      if (!response.ok) throw new Error('Error en servidor');

      showNotify("Perfil Fiscal actualizado en base de datos");
    } catch (error) {
      console.error(error);
      showNotify("Error al guardar configuración", "error");
    }
  }, [businessInfo, showNotify]);

  const saveBusinessField = useCallback(async (data: Record<string, any>, silent = true) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/business`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Error en servidor');
      if (!silent) showNotify("Configuración guardada");
    } catch (error) {
      console.error('Error al guardar campo:', error);
    }
  }, [showNotify]);

  const handleSignatureFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSignatureFile(file);
      try {
        const buffer = await file.arrayBuffer();
        setSignatureBuffer(buffer);

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          const updatedFeatures = { ...(businessInfo.features || {}), signatureP12: base64 };
          setBusinessInfo(prev => ({
            ...prev,
            features: updatedFeatures
          }));
          saveBusinessField({ features: updatedFeatures });
        };

        if (businessInfo.isDemo) {
          try {
            const token = localStorage.getItem('adminToken');
            await fetch(`${API_URL}/api/business/demo`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ enable: false })
            });
            setBusinessInfo(prev => ({ ...prev, isDemo: false }));
            showNotify('Firma digital cargada. Modo demo desactivado. Ahora puedes usar el sistema en producción.');
          } catch (error) {
            console.error("Error al desactivar modo demo", error);
            showNotify('Firma digital cargada correctamente. Por favor, desactiva el modo demo manualmente.');
          }
        } else {
          showNotify('Firma digital cargada correctamente');
        }
      } catch (error) {
        showNotify('Error al cargar la firma digital', 'error');
      }
    }
  }, [businessInfo.features, businessInfo.isDemo, saveBusinessField, showNotify]);

  const handleSaveNotificationSettings = useCallback(async (settings: NotificationSettings) => {
    setNotificationSettings(settings);

    try {
      const updatedBusinessInfo = {
        ...businessInfo,
        notificationSettings: settings
      };

      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/business`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedBusinessInfo)
      });

      if (!response.ok) throw new Error('Error guardando en servidor');

      setBusinessInfo(updatedBusinessInfo);
      showNotify('Configuración de notificaciones guardada en Base de Datos', 'success');
    } catch (error) {
      console.error(error);
      showNotify('Error al guardar configuración remota', 'error');
    }
  }, [businessInfo, showNotify]);

  const value: AppContextType = useMemo(() => ({
    isAuthenticated, setIsAuthenticated,
    activeTab, setActiveTab,
    selectedBusinessId, setSelectedBusinessId,
    isDemoMode, setIsDemoMode,
    businesses, setBusinesses,
    loadingBusinesses, setLoadingBusinesses,
    currentUser, setCurrentUser,
    subscriptionExpired, setSubscriptionExpired,
    subscriptionPending, setSubscriptionPending,
    clients, setClients,
    products, setProducts,
    documents, setDocuments,
    quicksales, setQuicksales,
    pendingActivationCount, setPendingActivationCount,
    businessInfo, setBusinessInfo,
    emissionPoints, setEmissionPoints,
    selectedEmissionPoint, setSelectedEmissionPoint,
    signatureFile, setSignatureFile,
    signatureBuffer, setSignatureBuffer,
    signaturePassword, setSignaturePassword,
    notificationSettings, setNotificationSettings,
    notifications, setNotifications,
    toasts, setToasts,
    currentPlanHasAI, setCurrentPlanHasAI,
    currentPlanHasAudit, setCurrentPlanHasAudit,
    currentPlanDurationDays, setCurrentPlanDurationDays,
    currentPlanMaxInvoices, setCurrentPlanMaxInvoices,
    currentPlanMaxEmissionPoints, setCurrentPlanMaxEmissionPoints,
    pointsProgramEnabled, setPointsProgramEnabled,
    preloadRejectedDoc, setPreloadRejectedDoc,
    reportsFilter, setReportsFilter,
    hasModuleControl, setHasModuleControl,
    modulePermissions, setModulePermissions,
    fileInputRef, logoInputRef,
    showNotify,
    handleDocumentAuthorized,
    handleActivateProduction,
    toggleDarkMode,
    toggleDemoMode,
    saveBusinessConfig,
    saveBusinessField,
    handleSaveNotificationSettings,
    handleSignatureFileChange,
  }), [
    isAuthenticated, activeTab, selectedBusinessId, isDemoMode, businesses,
    loadingBusinesses, currentUser, subscriptionExpired, subscriptionPending,
    clients, products, documents, quicksales, pendingActivationCount,
    businessInfo, emissionPoints, selectedEmissionPoint, signatureFile,
    signatureBuffer, signaturePassword, notificationSettings, notifications,
    toasts, currentPlanHasAI, currentPlanHasAudit, currentPlanDurationDays,
    currentPlanMaxInvoices, currentPlanMaxEmissionPoints, pointsProgramEnabled,
    preloadRejectedDoc, reportsFilter, hasModuleControl, modulePermissions,
    showNotify, handleDocumentAuthorized, handleActivateProduction,
    toggleDarkMode, toggleDemoMode, saveBusinessConfig, saveBusinessField,
    handleSaveNotificationSettings, handleSignatureFileChange,
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within an AppProvider');
  return ctx;
};
