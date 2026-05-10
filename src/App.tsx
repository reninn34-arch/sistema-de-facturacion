import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SunIcon, MoonIcon, EyeIcon, EyeSlashIcon, CameraIcon, DocumentTextIcon, ShieldCheckIcon, UserIcon, KeyIcon, TrashIcon } from '@heroicons/react/24/outline';
import Layout from './layouts/Layout';
import Dashboard from './modules/saas/components/Dashboard';
import InvoiceForm from './modules/facturacion/components/InvoiceForm';
import CreditNoteForm from './modules/facturacion/components/CreditNoteForm';
import RetentionForm from './modules/facturacion/components/RetentionForm';
import RemittanceForm from './modules/facturacion/components/RemittanceForm';
import SettlementForm from './modules/facturacion/components/SettlementForm';
import SalesBook from './modules/reportes/components/SalesBook';
import ATSReport from './modules/reportes/components/ATSReport';
import Form104 from './modules/reportes/components/Form104';
import Kardex from './modules/facturacion/components/Kardex';
import ProfitabilityAnalysis from './modules/reportes/components/ProfitabilityAnalysis';
import NotificationSettingsComponent from './modules/configuracion/components/NotificationSettings';
import AIAssistant from './modules/saas/components/AIAssistant';
import ClientManager from './modules/clientes/components/ClientManager';
import ProductManager from './modules/clientes/components/ProductManager';
import Reports from './modules/reportes/components/Reports';
import Integrations from './modules/configuracion/components/Integrations';
import { Client, Product, AppNotification, Document, DocumentType, SriStatus, BusinessInfo, InvoiceItem, NotificationSettings } from './types/types';
import { MOCK_CLIENTS, MOCK_PRODUCTS } from './constants';

import Login from './modules/autenticacion/pages/Login';
import ClientLogin from './modules/autenticacion/pages/ClientLogin';
import ClientDashboard from './modules/clientes/pages/ClientDashboard';
import AdminUsers from './modules/admin/pages/AdminUsers';
import { client } from './api/client';
import SubscriptionPage from './modules/saas/pages/SubscriptionPage';
import SubscriptionManager from './modules/saas/pages/SubscriptionManager';
import SubscriptionInvoice from './modules/saas/pages/SubscriptionInvoice';
import SaasAdmin from './modules/saas/pages/SaasAdmin';
import SaasEmission from './modules/saas/pages/SaasEmission';
import SubscriptionPlansManager from './modules/saas/pages/SubscriptionPlansManager';
import SaasCreditNote from './modules/saas/pages/SaasCreditNote';
import CompanyUsers from './modules/admin/pages/CompanyUsers';
import UserManagement from './modules/admin/pages/UserManagement';
import SalesSummary from './modules/saas/pages/SalesSummary';
import PagoInterno from './modules/saas/pages/SubscriptionPayment';
import ActivationRequests from './modules/admin/pages/ActivationRequests';

// URL del backend definida en variable de entorno o fallback
// Usar variable de entorno VITE_BACKEND_URL para producción en Railway
const API_URL = import.meta.env.VITE_BACKEND_URL || '';

// Interface para empresas (usada en módulos SaaS)
interface Business {
  id: string;
  name: string;
  ruc: string;
  email: string;
  subscriptionEnd: string | null;
  isActive: boolean;
  plan: string;
}

const App: React.FC = () => {

  // ESTADO DE SEGURIDAD: Verificamos si existe el token al cargar
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('adminToken'));
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);

  // --- ESTADO DEL MODO DEMO ---
  // Por defecto false (Modo Producción). Los Superadmins siempre usan modo producción.
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Estado para empresas del SaaS (cargadas desde DB)
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loadingBusinesses, setLoadingBusinesses] = useState(false);

  const [currentUser, setCurrentUser] = useState<any>(() => {
    const userStr = localStorage.getItem('adminUser');
    return userStr ? JSON.parse(userStr) : null;
  });

  // Estado para verificar suscripción vencida
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);
  
  // Estado para verificar suscripción pendiente de aprobación
  const [subscriptionPending, setSubscriptionPending] = useState(false);

  // Estado para gestión de perfil personal
  const [personalEmail, setPersonalEmail] = useState('');
  const [showProfilePassword, setShowProfilePassword] = useState(false);
  const [showSignaturePassword, setShowSignaturePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });

  // --- ESTADOS PRINCIPALES DE DATOS ---
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    name: '',
    tradename: '',
    ruc: '',
    address: '',
    branchAddress: '',
    phone: '',
    email: '',
    category: 'RETAIL',
    regime: 'GENERAL',
    isAccountingObliged: false,
    isProduction: false,
    themeColor: '#3B82F6',
    establishmentCode: '001',
    emissionPointCode: '001',
    taxpayerType: 'PERSONA_NATURAL',
  });

  // --- ESTADOS DE FIRMA DIGITAL ---
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signatureBuffer, setSignatureBuffer] = useState<ArrayBuffer | null>(null);
  const [signaturePassword, setSignaturePassword] = useState('');

  // --- ESTADO DE NOTIFICACIONES CONFIGURACIÓN ---
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailEnabled: false,
    smsEnabled: false,
    whatsappEnabled: false,
    paymentRemindersEnabled: false,
    reminderDaysBefore: [3, 7, 15],
  });

  // --- REFS ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [notifications, setNotifications] = useState<AppNotification[]>([
    { id: '1', text: 'Bienvenido al sistema Ecuafact Pro', type: 'info', time: new Date(), read: false },
  ]);
  const [toasts, setToasts] = useState<AppNotification[]>([]);

  const showNotify = useCallback((text: string, type: AppNotification['type'] = 'success') => {
    const newNotif: AppNotification = {
      id: Math.random().toString(36).substr(2, 9),
      text,
      type,
      time: new Date(),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
    setToasts(prev => [...prev, newNotif]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== newNotif.id)), 4000);
  }, []);

  // 🔥 EFECTO DE CARGA DE DATOS DESDE POSTGRESQL
  useEffect(() => {
    const userStr = localStorage.getItem('adminUser');
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
      const userObj = JSON.parse(userStr);
      if (userObj.email) setPersonalEmail(userObj.email);
    }
  }, [isAuthenticated]);

  // 🔒 FORZAR CAMBIO DE CONTRASEÑA
  useEffect(() => {
    if (currentUser?.requirePasswordChange && activeTab !== 'config') {
      setActiveTab('config');
      showNotify('Por seguridad, debe actualizar su contraseña para continuar.', 'warning');
    }
  }, [currentUser, activeTab]);

  // Efecto para aplicar el modo oscuro basado en la configuración de la empresa
  useEffect(() => {
    const features = (businessInfo as any).features;
    const systemPrefersDark = false; // Desactivado por defecto a petición del usuario
    const isDark = features?.isDarkMode !== undefined ? features.isDarkMode : systemPrefersDark;
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [businessInfo]);

  // Efecto para cargar empresas desde la DB para el módulo SaaS
  useEffect(() => {
    const loadBusinesses = async () => {
      if (currentUser?.role !== 'SUPERADMIN') {
        return; // Solo cargar para SUPERADMIN
      }

      // Si ya hay empresas cargadas, no volver a cargar
      if (businesses.length > 0) {
        return;
      }

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
  }, [currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  // Efecto para recargar empresas cuando se entra al módulo de emisión
  useEffect(() => {
    const loadBusinessesOnTabChange = async () => {
      if (activeTab !== 'subscription-invoices' && activeTab !== 'subscription-sri-invoice' && activeTab !== 'saas-credit-notes') {
        return;
      }
      if (currentUser?.role !== 'SUPERADMIN') {
        return;
      }

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

    const loadData = async () => {
      // CASO A: MODO DEMO (Usamos tus Mocks originales)
      // Si el modo demo está activado localmente o desde el backend
      const backendIsDemo = (await client.get<{ isDemo: boolean }>('/api/business/demo').catch(() => ({ data: { isDemo: false } })) as any).data?.isDemo || false;
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
      // CASO B: MODO REAL (Cargar desde BD)

      try {

        // Carga resiliente: Si falla uno, no detiene a los demás
        const loadBusiness = client.get<BusinessInfo>('/api/business').catch(e => { console.error("Error loading business", e); return null; });
        const loadClients = client.get<Client[]>('/api/clients').catch(e => { console.error("Error loading clients", e); return []; });
        const loadProducts = client.get<Product[]>('/api/products').catch(e => { console.error("Error loading products", e); return []; });
        const loadDocs = client.get<Document[]>('/api/documents').catch(e => { console.error("Error loading documents", e); return []; });

        const [empresa, clientes, productos, docs] = await Promise.all([loadBusiness, loadClients, loadProducts, loadDocs]);

        if (empresa) {
          setBusinessInfo(empresa);

          // Verificar si la suscripción está vencida (solo para empresas, no superadmins)
          // Los SUPERADMINES no tienen restricción de suscripción
          if (currentUser?.role !== 'SUPERADMIN') {
            const now = new Date();
            const subscriptionEnd = empresa.subscriptionEnd ? new Date(empresa.subscriptionEnd) : null;
            const isExpired = subscriptionEnd && subscriptionEnd < now;
            const isNotActive = (empresa as any).isActive === false;
            const isPending = (empresa as any).subscriptionStatus === 'PENDING';
            
            // Guardar el estado de suscripción pendiente
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

        // Siempre cargar documentos aunque la suscripción esté pendiente
        // El usuario puede ver sus facturas existentes aunque no pueda crear nuevas

        // Restaurar firma si existe en features
        const features = (empresa as any)?.features || {};
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
        // Opcional: Si falla la DB, ¿quieres pasar a Demo automáticamente?
        // setIsDemoMode(true); 
        showNotify("Error de conexión con el servidor. Revise su internet.", "error");
      }
    };

    loadData();
  }, [isAuthenticated, isDemoMode]); // <-- Se recarga si cambias el switch



  // Cargar el archivo de firma cuando se selecciona
  const handleSignatureFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSignatureFile(file);
      try {
        const buffer = await file.arrayBuffer();
        setSignatureBuffer(buffer);

        // Convertir a Base64 para guardar en features
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          setBusinessInfo(prev => ({
            ...prev,
            features: { ...((prev as any).features || {}), signatureP12: base64 }
          }));
        };

        // Si está en modo demo, salir del modo demo al cargar la firma
        if ((businessInfo as any).isDemo) {
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
  };

  // ⚡ HANDLER AUTORIZACIÓN: Guarda en BD
  const handleDocumentAuthorized = async (doc: Document, items?: InvoiceItem[]) => {
    // MODO DEMO: Guardado local simulado (Memoria)
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
      // 1. Intentar guardar en Base de Datos
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

      // 2. Actualizar estado local con datos reales de BD
      setDocuments(prev => [savedDoc, ...prev]);

      // 3. Recargar productos para actualizar stock
      if (items) {
        const prodRes = await fetch(`${API_URL}/api/products`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (prodRes.ok) setProducts(await prodRes.json());
      }

      showNotify("Documento autorizado y guardado en base de datos", "success");

    } catch (error) {
      console.error(error);
      // Fallback: Actualizar estado local aunque falle la BD para que el usuario no pierda el trabajo
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
  };

  const toggleEnvironment = async () => {
    const nextState = !businessInfo.isProduction;
    if (nextState && !signatureFile) {
      showNotify("Sube tu firma .p12 para activar PRODUCCIÓN", "warning");
    }
    setBusinessInfo(prev => ({ ...prev, isProduction: nextState }));

    // Guardar inmediatamente en BD
    try {
      const token = localStorage.getItem('adminToken');
      await fetch(`${API_URL}/api/business`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isProduction: nextState })
      });
      showNotify(`Modo ${nextState ? 'PRODUCCIÓN' : 'PRUEBAS'} activo y guardado`);
    } catch (error) {
      console.error(error);
    }
  };

  const toggleDarkMode = async () => {
    const currentFeatures = (businessInfo as any).features || {};
    const systemPrefersDark = false; // Desactivado por defecto a petición del usuario
    const currentIsDark = currentFeatures.isDarkMode !== undefined ? currentFeatures.isDarkMode : systemPrefersDark;
    const newIsDark = !currentIsDark;

    const updatedFeatures = {
      ...currentFeatures,
      isDarkMode: newIsDark
    };

    setBusinessInfo(prev => ({ ...prev, features: updatedFeatures }));

    showNotify(newIsDark ? "Modo oscuro activado 🌙" : "Modo claro activado ☀️");

    // Guardar preferencia en BD inmediatamente
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
  };

  // 🎮 MODO DEMO - Activar/Desactivar
  const toggleDemoMode = async () => {
    const currentIsDemo = (businessInfo as any).isDemo || false;
    const newIsDemo = !currentIsDemo;

    if (newIsDemo) {
      // Activar modo demo - verificar que no tenga firma
      const currentFeatures = (businessInfo as any).features || {};
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
        // También actualizar el estado local isDemoMode para que funcione con la lógica existente
        setIsDemoMode(newIsDemo);
        showNotify(data.message || (newIsDemo ? "Modo demo activado 🎮" : "Modo demo desactivado"));
      } else {
        showNotify(data.message || "Error al cambiar modo demo", "error");
      }
    } catch (error) {
      console.error("Error toggling demo mode", error);
      showNotify("Error al cambiar modo demo", "error");
    }
  };

  // 💾 GUARDAR CONFIGURACIÓN EMPRESARIAL
  const saveBusinessConfig = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      // Excluir el ID del objeto para evitar errores de actualización en Prisma
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
  };

  // 👤 ACTUALIZAR PERFIL PERSONAL
  const handleUpdateProfile = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: personalEmail })
      });
      const data = await response.json();
      if (data.success) {
        showNotify('Correo personal actualizado correctamente');
        // Actualizar estado local y storage
        const newUser = { ...currentUser, email: data.user.email };
        localStorage.setItem('adminUser', JSON.stringify(newUser));
        setCurrentUser(newUser);
      } else {
        showNotify(data.message, 'error');
      }
    } catch (error) {
      showNotify('Error al actualizar perfil', 'error');
    }
  };

  // 🔐 CAMBIAR CONTRASEÑA
  const handleChangePassword = async () => {
    if (passwordData.new !== passwordData.confirm) {
      showNotify('Las contraseñas nuevas no coinciden', 'error');
      return;
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(passwordData.new)) {
      showNotify('La contraseña debe tener al menos 8 caracteres, una mayúscula y un número.', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/user/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.current,
          newPassword: passwordData.new
        })
      });
      const data = await response.json();
      if (data.success) {
        showNotify('Contraseña actualizada correctamente');
        setPasswordData({ current: '', new: '', confirm: '' });
        // Actualizar estado local para quitar el bloqueo
        const updatedUser = { ...currentUser, requirePasswordChange: false };
        setCurrentUser(updatedUser);
        localStorage.setItem('adminUser', JSON.stringify(updatedUser));
      } else {
        showNotify(data.message, 'error');
      }
    } catch (error) {
      showNotify('Error al cambiar contraseña', 'error');
    }
  };

  // ✅ NUEVA FUNCIÓN: Guardar configuración de notificaciones en BD
  const handleSaveNotificationSettings = async (settings: NotificationSettings) => {
    // 1. Actualizar estado local inmediatamente
    setNotificationSettings(settings);

    try {
      // 2. Fusionar con la info del negocio actual
      const updatedBusinessInfo = {
        ...businessInfo,
        notificationSettings: settings
      };

      const token = localStorage.getItem('adminToken');
      // 3. Enviar al backend
      const response = await fetch(`${API_URL}/api/business`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedBusinessInfo)
      });

      if (!response.ok) throw new Error('Error guardando en servidor');

      // 4. Actualizar estado de negocio local
      setBusinessInfo(updatedBusinessInfo);
      showNotify('Configuración de notificaciones guardada en Base de Datos', 'success');
    } catch (error) {
      console.error(error);
      showNotify('Error al guardar configuración remota', 'error');
    }
  };

  // ESTADO DE SEGURIDAD: Verificamos si existe el token al cargar
  //LA COMPUERTA (Inserta esto ANTES del 'return' principal)

  // 1. Ruta pública para Portal de Clientes
  if (window.location.pathname === '/portal/login') {
    return <ClientLogin />;
  }
  // 2. Ruta protegida para Dashboard de Clientes
  if (window.location.pathname === '/portal/dashboard') {
    return <ClientDashboard />;
  }
  // 3. Ruta pública para Suscripciones
  if (window.location.pathname === '/suscripcion') {
    return <SubscriptionPage />;
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  const renderContent = () => {
    // Si la suscripción está vencida, solo mostrar el módulo de pago interno (solo para empresas, no superadmins)
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
            setSubscriptionExpired(false);
            setSubscriptionPending(false);
            setActiveTab('dashboard');
            // Limpiar flags de localStorage
            localStorage.setItem('subscriptionExpired', 'false');
            localStorage.setItem('subscriptionPending', 'false');
            // Recargar datos de la empresa
            try {
              const token = localStorage.getItem('adminToken');
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
          onBack={() => { }}
          onNotify={showNotify}
        />
      );
    }

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
              setSubscriptionExpired(false);
              setSubscriptionPending(false);
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
            {/* Mostrar resumen de ventas solo a administradores de empresa */}
            {currentUser?.role === 'ADMIN' && <SalesSummary documents={documents} />}
            <Dashboard documents={documents} products={products} setActiveTab={setActiveTab} currentUser={currentUser} businessInfo={businessInfo} />
          </div>
        );

      case 'invoices': return <InvoiceForm clients={clients} products={products} businessInfo={businessInfo} signatureFile={signatureFile} signaturePassword={signaturePassword} notificationSettings={notificationSettings} onNotify={showNotify} onAuthorize={handleDocumentAuthorized} />;
      case 'credit-notes': return (
        <CreditNoteForm
          clients={clients}
          products={products}
          invoices={documents}
          businessInfo={businessInfo}
          signatureOptions={signatureBuffer && signaturePassword ? {
            p12File: signatureBuffer,
            password: signaturePassword,
            claveAcceso: '' // Se genera dentro del componente
          } : null}
          onDocumentCreated={handleDocumentAuthorized}
        />
      );
      case 'retentions': return <RetentionForm business={businessInfo} clients={clients} onSubmit={(retention, xml) => showNotify('Retención generada exitosamente')} />;
      case 'remittances': return <RemittanceForm business={businessInfo} clients={clients} products={products} onSubmit={(guide, xml) => showNotify('Guía de remisión generada exitosamente')} />;
      case 'settlements': return <SettlementForm business={businessInfo} clients={clients} products={products} onSubmit={(settlement, xml) => showNotify('Liquidación generada exitosamente')} />;
      case 'sales-book': return <SalesBook documents={documents} business={businessInfo} onNotify={showNotify} />;
      case 'ats': return <ATSReport documents={documents} business={businessInfo} onNotify={showNotify} />;
      case 'form-104': return <Form104 documents={documents} business={businessInfo} onNotify={showNotify} />;
      case 'kardex': return <Kardex products={products} documents={documents} onNotify={showNotify} />;
      case 'profitability': return <ProfitabilityAnalysis products={products} documents={documents} onNotify={showNotify} />;
      case 'notifications': return <NotificationSettingsComponent settings={notificationSettings} onSave={handleSaveNotificationSettings} onNotify={showNotify} />;
      case 'reports': return <Reports documents={documents} businessInfo={businessInfo} />; case 'ai-assistant': return <AIAssistant businessInfo={businessInfo} />;

      // Panel SaaS - SOLO para SUPERADMIN
      case 'saas-admin':
        // Solo el SUPERADMIN puede acceder al panel de gestión de empresas
        if (currentUser?.role !== 'SUPERADMIN') {
          showNotify('Acceso restringido. Solo el Superadministrador puede acceder a esta sección.', 'error');
          return <Dashboard documents={documents} products={products} setActiveTab={setActiveTab} currentUser={currentUser} />;
        }
        return <SaasAdmin onNotify={showNotify} />;

      case 'subscription-invoices':
      case 'subscription-sri-invoice':
        // Emisión de facturas para SUPERADMIN - módulo independiente
        if (currentUser?.role !== 'SUPERADMIN') {
          showNotify('Acceso restringido', 'error');
          return <Dashboard documents={documents} products={products} setActiveTab={setActiveTab} currentUser={currentUser} />;
        }
        return <SaasEmission businesses={businesses} onNotify={showNotify} />;

      case 'subscription-plans':
        // Gestión de planes de suscripción para SUPERADMIN
        if (currentUser?.role !== 'SUPERADMIN') {
          showNotify('Acceso restringido', 'error');
          return <Dashboard documents={documents} products={products} setActiveTab={setActiveTab} currentUser={currentUser} />;
        }
        return <SubscriptionPlansManager onNotify={showNotify} />;

      case 'activation-requests':
        // Solicitudes de activación de suscripciones para SUPERADMIN
        if (currentUser?.role !== 'SUPERADMIN') {
          showNotify('Acceso restringido', 'error');
          return <Dashboard documents={documents} products={products} setActiveTab={setActiveTab} currentUser={currentUser} />;
        }
        return <ActivationRequests onNotify={showNotify} />;

      case 'saas-credit-notes':
        // Notas de crédito / Devoluciones para SUPERADMIN
        if (currentUser?.role !== 'SUPERADMIN') {
          showNotify('Acceso restringido', 'error');
          return <Dashboard documents={documents} products={products} setActiveTab={setActiveTab} currentUser={currentUser} />;
        }
        return <SaasCreditNote businesses={businesses} documents={documents} onNotify={showNotify} />;

      case 'subscription-reports':
        // Contabilidad para SUPERADMIN
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
        // Redirección para compatibilidad - solo SUPERADMIN
        if (currentUser?.role !== 'SUPERADMIN') {
          showNotify('Acceso restringido', 'error');
          return <Dashboard documents={documents} products={products} setActiveTab={setActiveTab} currentUser={currentUser} />;
        }
        return <SaasAdmin onNotify={showNotify} />;
      case 'admin-users':
        // Redirección para compatibilidad - solo SUPERADMIN
        if (currentUser?.role !== 'SUPERADMIN') {
          showNotify('Acceso restringido', 'error');
          return <Dashboard documents={documents} products={products} setActiveTab={setActiveTab} currentUser={currentUser} />;
        }
        return <SaasAdmin onNotify={showNotify} />;

      case 'company-users':
        // Admin de Empresa pueden gestionar usuarios de su empresa
        if (currentUser?.role !== 'ADMIN') {
          showNotify('Acceso restringido', 'error');
          return <Dashboard documents={documents} products={products} setActiveTab={setActiveTab} />;
        }
        // Usar UserManagement con diseño de tabla para Gestión Global
        return <UserManagement currentUser={currentUser} onNotify={showNotify} />;

      case 'user-management':
        // Ruta eliminada - cada rol tiene su propio panel dedicado
        showNotify('Acceso no disponible', 'error');
        return <Dashboard documents={documents} products={products} setActiveTab={setActiveTab} currentUser={currentUser} />;

      case 'clients': return <ClientManager clients={clients} setClients={setClients} onNotify={showNotify} isDemoMode={isDemoMode} currentUser={currentUser} />;
      case 'products': return <ProductManager products={products} setProducts={setProducts} onNotify={showNotify} isDemoMode={isDemoMode} />;
      case 'integrations': return <Integrations products={products} clients={clients} businessInfo={businessInfo} onOrderAuthorized={handleDocumentAuthorized} onNotify={showNotify} onUpdateProducts={setProducts} />;
      case 'config':

        const isUserAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPERADMIN';

        return (
          <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
            {/* Header del Perfil */}
            <div className="bg-white dark:bg-slate-800 p-10 rounded-[3.5rem] shadow-sm dark:shadow-lg dark:shadow-black/10 border border-slate-100 dark:border-slate-700/50 flex flex-col md:flex-row justify-between items-center gap-8 transition-colors duration-300">
              <div className="flex items-center gap-6">
                <div
                  className="w-24 h-24 bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-[2.5rem] flex items-center justify-center cursor-pointer overflow-hidden group relative"
                  onClick={() => isUserAdmin && logoInputRef.current?.click()}
                >
                  {businessInfo.logo ? <img src={businessInfo.logo} className="w-full h-full object-cover" /> : <CameraIcon className="w-8 h-8 text-slate-300 dark:text-slate-600" />}
                  {isUserAdmin && <div className="absolute inset-0 bg-indigo-600/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-black text-white uppercase">Editar</div>}
                  <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && file instanceof File) {
                      const reader = new FileReader();
                      reader.onloadend = () => setBusinessInfo(prev => ({ ...prev, logo: reader.result as string }));
                      reader.readAsDataURL(file);
                    }
                  }} />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">{businessInfo.tradename || businessInfo.name}</h2>
                  <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">RUC: {businessInfo.ruc}</p>
                </div>
              </div>
              {/* Botones de configuración según el rol */}
              {currentUser?.role === 'SUPERADMIN' ? (
                <div className="flex gap-4 flex-wrap">
                  <button
                    onClick={toggleDarkMode}
                    className={`px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl inline-flex items-center gap-2 ${(businessInfo as any).features?.isDarkMode ? 'bg-slate-800 text-white shadow-slate-800/20' : 'bg-amber-500 text-white shadow-amber-500/20'}`}
                  >
                    {(businessInfo as any).features?.isDarkMode ? (
                      <><MoonIcon className="w-4 h-4" /> Modo Oscuro</>
                    ) : (
                      <><SunIcon className="w-4 h-4" /> Modo Claro</>
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex gap-4 flex-wrap">
                  <button
                    onClick={() => {
                      const newType = businessInfo.taxpayerType === 'EMPRESA' ? 'PERSONA_NATURAL' : 'EMPRESA';
                      setBusinessInfo(prev => ({ ...prev, taxpayerType: newType }));
                      showNotify(`Cambiado a ${newType === 'EMPRESA' ? 'Empresa' : 'Persona Natural'}`);
                    }}
                    className={`px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl ${businessInfo.taxpayerType === 'EMPRESA' ? 'bg-indigo-600 text-white shadow-indigo-600/20' : 'bg-purple-600 text-white shadow-purple-600/20'
                      }`}
                  >
                    {businessInfo.taxpayerType === 'EMPRESA' ? 'Empresa' : 'Persona Natural'}
                  </button>
                  <button
                    onClick={toggleDarkMode}
                    className={`px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl inline-flex items-center gap-2 ${(businessInfo as any).features?.isDarkMode ? 'bg-slate-800 text-white shadow-slate-800/20' : 'bg-amber-500 text-white shadow-amber-500/20'}`}
                  >
                    {(businessInfo as any).features?.isDarkMode ? (
                      <><MoonIcon className="w-4 h-4" /> Modo Oscuro</>
                    ) : (
                      <><SunIcon className="w-4 h-4" /> Modo Claro</>
                    )}
                  </button>
                </div>
              )}
              {/* Solo mostrar advertencia de firma no configurada cuando no hay firma */}
              {!signatureFile && (
                <div className="px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-red-500 text-white shadow-red-500/20">
                  ⚠️ Firma electrónica no configurada
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                {/* Datos Tributarios */}
                {isUserAdmin && (
                  <section className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-700/50 shadow-sm dark:shadow-lg dark:shadow-black/10 space-y-8 transition-colors duration-300">
                    <h3 className="font-black text-slate-800 dark:text-white text-xl uppercase tracking-tighter border-b border-slate-50 dark:border-slate-700/50 pb-4 flex items-center gap-3">
                      <DocumentTextIcon className="w-6 h-6 text-indigo-500" /> Información Legal (SRI)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">RUC</label>
                        <input
                          type="text"
                          value={businessInfo.ruc || ''}
                          placeholder="1234567890001"
                          maxLength={13}
                          className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-2xl font-black text-sm outline-none border-2 border-transparent focus:border-indigo-500 transition-colors"
                          onChange={e => setBusinessInfo({ ...businessInfo, ruc: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                          {businessInfo.taxpayerType === 'PERSONA_NATURAL' ? 'Nombre Completo' : 'Razón Social'}
                        </label>
                        <input
                          type="text"
                          value={businessInfo.name || ''}
                          placeholder={businessInfo.taxpayerType === 'PERSONA_NATURAL' ? 'Ej: Juan Pérez Gómez' : 'Ej: CORPORACION EJEMPLO S.A.'}
                          className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-indigo-500 transition-colors"
                          onChange={e => setBusinessInfo({ ...businessInfo, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nombre Comercial</label>
                        <input
                          type="text"
                          value={businessInfo.tradename || ''}
                          placeholder={businessInfo.taxpayerType === 'PERSONA_NATURAL' ? 'Ej: Tienda Juan' : 'Ej: ECUAFACT ENTERPRISE'}
                          className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-indigo-500 transition-colors"
                          onChange={e => setBusinessInfo({ ...businessInfo, tradename: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Dirección Matriz</label>
                        <input type="text" value={businessInfo.address || ''} className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-indigo-500 transition-colors" onChange={e => setBusinessInfo({ ...businessInfo, address: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Dirección Sucursal</label>
                        <input type="text" value={businessInfo.branchAddress || ''} className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-indigo-500 transition-colors" onChange={e => setBusinessInfo({ ...businessInfo, branchAddress: e.target.value })} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Estab.</label>
                        <input type="text" placeholder="001" value={businessInfo.establishmentCode || ''} className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-2xl font-black text-center text-sm" onChange={e => setBusinessInfo({ ...businessInfo, establishmentCode: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Pto. Emisión</label>
                        <input type="text" placeholder="001" value={businessInfo.emissionPointCode || ''} className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-2xl font-black text-center text-sm" onChange={e => setBusinessInfo({ ...businessInfo, emissionPointCode: e.target.value })} />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Obligado Contabilidad</label>
                        <div className="flex bg-slate-50 dark:bg-slate-800/50 p-1 rounded-2xl h-[52px]">
                          <button onClick={() => setBusinessInfo({ ...businessInfo, isAccountingObliged: true })} className={`flex-1 rounded-xl text-[10px] font-black uppercase transition-all ${businessInfo.isAccountingObliged ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>SÍ</button>
                          <button onClick={() => setBusinessInfo({ ...businessInfo, isAccountingObliged: false })} className={`flex-1 rounded-xl text-[10px] font-black uppercase transition-all ${!businessInfo.isAccountingObliged ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>NO</button>
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {/* Regímenes y Resoluciones */}
                {isUserAdmin && (
                  <section className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-700/50 shadow-sm dark:shadow-lg dark:shadow-black/10 space-y-8 transition-colors duration-300">
                    <h3 className="font-black text-slate-800 dark:text-white text-xl uppercase tracking-tighter border-b border-slate-50 dark:border-slate-700/50 pb-4 flex items-center gap-3">
                      <ShieldCheckIcon className="w-6 h-6 text-emerald-500" /> Regímenes Especiales
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Tipo de Régimen</label>
                        <select className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-2xl font-bold text-sm outline-none" value={businessInfo.regime} onChange={e => setBusinessInfo({ ...businessInfo, regime: e.target.value as any })}>
                          <option value="GENERAL">Régimen General</option>
                          <option value="RIMPE_EMPRENDEDOR">RIMPE - Emprendedor</option>
                          <option value="RIMPE_POPULAR">RIMPE - Negocio Popular</option>
                          <option value="ARTESANO">Artesano Calificado</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Agente de Retención (Res.)</label>
                        <input type="text" placeholder="Ej: NAC-DNCRASC20-00000001" value={businessInfo.withholdingAgentCode || ''} className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-2xl font-bold text-sm" onChange={e => setBusinessInfo({ ...businessInfo, withholdingAgentCode: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Contribuyente Especial (Nro)</label>
                        <input type="text" placeholder="Ej: 000" value={businessInfo.specialTaxpayerCode || ''} className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-2xl font-bold text-sm" onChange={e => setBusinessInfo({ ...businessInfo, specialTaxpayerCode: e.target.value })} />
                      </div>
                    </div>
                  </section>
                )}

                {/* SECCIÓN: MI CUENTA PERSONAL */}
                <section className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-700/50 shadow-sm dark:shadow-lg dark:shadow-black/10 space-y-8 transition-colors duration-300">
                  <h3 className="font-black text-slate-800 dark:text-white text-xl uppercase tracking-tighter border-b border-slate-50 dark:border-slate-700/50 pb-4 flex items-center gap-3">
                    <UserIcon className="w-6 h-6 text-purple-500" /> Mi Cuenta (Acceso Personal)
                  </h3>

                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Correo Electrónico Personal (Login)</label>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          value={personalEmail}
                          onChange={(e) => setPersonalEmail(e.target.value)}
                          className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-purple-500 transition-colors"
                        />
                        <button onClick={handleUpdateProfile} className="px-6 bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-2xl font-bold text-xs hover:bg-purple-200 dark:hover:bg-purple-500/20 transition-colors">
                          Guardar
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 ml-1">Este correo es para iniciar sesión y recuperar contraseña. No aparece en las facturas.</p>
                    </div>

                    <div className="pt-6 border-t border-slate-50 dark:border-slate-700/50">
                      <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-4">Cambiar Contraseña</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="relative">
                          <input
                            type={showProfilePassword ? "text" : "password"}
                            placeholder="Contraseña Actual"
                            value={passwordData.current}
                            onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                          className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-purple-500 transition-colors pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowProfilePassword(!showProfilePassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                          {showProfilePassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showProfilePassword ? "text" : "password"}
                          placeholder="Nueva Contraseña"
                          value={passwordData.new}
                          onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                          className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-purple-500 transition-colors pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowProfilePassword(!showProfilePassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                          {showProfilePassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                        </button>
                        </div>
                        <div className="relative">
                          <input
                            type={showProfilePassword ? "text" : "password"}
                            placeholder="Confirmar Nueva"
                            value={passwordData.confirm}
                            onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                            className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-purple-500 transition-colors"
                          />
                        </div>
                      </div>
                      <button
                        onClick={handleChangePassword}
                        disabled={!passwordData.current || !passwordData.new}
                        className="mt-4 w-full md:w-auto px-8 py-3 bg-slate-800 dark:bg-slate-700 text-white rounded-2xl font-bold text-xs hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
                      >
                        Actualizar Contraseña
                      </button>
                    </div>
                  </div>
                </section>
              </div>

              {/* Sidebar de Configuración */}
              {isUserAdmin && (
                <div className="space-y-8">
                  <section className="bg-slate-900 dark:bg-slate-900 text-white p-10 rounded-[3rem] space-y-8 shadow-2xl dark:shadow-black/30 border border-transparent dark:border-slate-700/50">
                    <div className="flex items-center justify-between border-b border-white/10 dark:border-slate-700/50 pb-6">
                      <h3 className="font-black text-indigo-400 text-xs uppercase tracking-widest">Certificado P12</h3>
                      <div className={`w-3 h-3 rounded-full ${signatureFile ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                    </div>

                    <div className="space-y-6">
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-10 border-2 border-dashed border-white/20 hover:border-indigo-500 hover:bg-white/5 rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all"
                      >
                        <KeyIcon className="w-8 h-8 mb-3 text-white/50" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/50">{signatureFile ? signatureFile.name : 'Subir firma .p12'}</p>
                      </div>
                      <input type="file" ref={fileInputRef} className="hidden" accept=".p12" onChange={handleSignatureFileChange} />

                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Contraseña de Firma</label>
                        <div className="relative">
                          <input
                            type={showSignaturePassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={signaturePassword}
                            onChange={e => {
                              setSignaturePassword(e.target.value);
                              setBusinessInfo(prev => ({
                                ...prev,
                                features: { ...((prev as any).features || {}), signaturePassword: e.target.value }
                              }));
                            }}
                            className="w-full p-4 pr-12 bg-white/5 border border-white/10 rounded-2xl font-bold text-sm focus:border-indigo-500 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSignaturePassword(!showSignaturePassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-400 transition-colors"
                          >
                            {showSignaturePassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      {/* Botón para eliminar firma */}
                      {signatureFile && (
                        <button
                          type="button"
                          onClick={() => {
                            setSignatureFile(null);
                            setSignatureBuffer(null);
                            setSignaturePassword('');
                            setBusinessInfo(prev => ({
                              ...prev,
                              features: { ...((prev as any).features || {}), signatureP12: null, signaturePassword: '' }
                            }));
                            showNotify('Firma digital eliminada. Puedes activar el modo demo.');
                          }}
                          className="w-full py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all inline-flex items-center justify-center gap-2"
                        >
                          <TrashIcon className="w-4 h-4" /> Eliminar Firma Digital
                        </button>
                      )}
                    </div>

                    <p className="text-[9px] text-slate-500 leading-relaxed italic">
                      * Tu firma es procesada localmente. Ecuafact Pro no almacena copias de tu certificado en servidores externos.
                    </p>
                  </section>

                  <button
                    onClick={saveBusinessConfig}
                    className="w-full py-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2.5rem] font-black uppercase text-xs tracking-widest shadow-2xl shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-95"
                  >
                    Guardar Cambios Legales
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      default: return <Dashboard documents={documents} products={products} setActiveTab={setActiveTab} />; // Fallback
    }

  };

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      notifications={notifications}
      businessInfo={businessInfo}
      onMarkRead={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
      onRemoveNotif={(id) => setNotifications(prev => prev.filter(n => n.id !== id))}
      currentUser={currentUser}
      subscriptionExpired={subscriptionExpired}
    >
      {renderContent()}

      {/* --- EL BOTÓN SECRETO DEL SUPERADMIN --- */}
      {currentUser?.role === 'SUPERADMIN' && (
        <div className="fixed top-5 right-24 z-[9999] flex items-center gap-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-slate-200 dark:border-slate-600/50 transition-colors duration-300">
          <button
            onClick={toggleDarkMode}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            {((businessInfo as any).features?.isDarkMode ?? false) ? (
              <><SunIcon className="w-4 h-4" /> Claro</>
            ) : (
              <><MoonIcon className="w-4 h-4" /> Oscuro</>
            )}
          </button>
        </div>
      )}
      {/* --- TOASTS DE NOTIFICACIONES --- */}
      <div className="fixed bottom-6 right-6 z-[999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
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

export default App;
