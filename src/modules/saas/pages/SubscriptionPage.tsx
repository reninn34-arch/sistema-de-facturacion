import React, { useState, useEffect } from 'react';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { CheckCircleIcon, LockClosedIcon, ShieldCheckIcon, ArrowLeftIcon, EyeIcon, EyeSlashIcon, CreditCardIcon, BuildingLibraryIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { BUSINESS_TYPES, BusinessType } from '../../../types/types';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

const BankDetails: React.FC = () => {
  const [bankSettings, setBankSettings] = useState<any>(null);
  useEffect(() => {
    fetch(`${API_URL}/api/admin/settings`)
      .then(r => r.json())
      .then(d => setBankSettings(d))
      .catch(() => {});
  }, []);

  const accounts = bankSettings?.bankAccounts || [];

  if (accounts.length === 0) {
    return <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
      <p><strong>Banco:</strong> Banco Pichincha</p>
      <p><strong>Cuenta:</strong> 1234567890</p>
    </div>;
  }
  return (
    <div className="space-y-3">
      {accounts.map((bank: any) => (
        <div key={bank.id} className="text-xs text-slate-600 dark:text-slate-400 space-y-1 p-3 bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
          <p><strong>Banco:</strong> {bank.bankName}</p>
          <p><strong>Cuenta:</strong> {bank.bankAccount}</p>
          <p><strong>Tipo:</strong> {bank.bankAccountType}</p>
          <p><strong>Titular:</strong> {bank.bankHolderName}</p>
          <p><strong>RUC:</strong> {bank.bankHolderRuc}</p>
        </div>
      ))}
    </div>
  );
};

// Interface para planes de suscripción
interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description: string;
  price: number;
  period: string;
  durationDays: number;
  features: string[];
  maxBusinesses: number;
  maxInvoicesPerMonth: number;
  hasAIAssistant: boolean;
  hasPrioritySupport: boolean;
  isActive: boolean;
}

// Configuración de PayPal - Las credenciales se configuran en el archivo .env
// Variables requeridas: VITE_PAYPAL_CLIENT_ID, VITE_PAYPAL_SANDBOX
// Para pruebas puedes usar: sb (sandbox) o un Client ID válido de PayPal Developer
const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || 'sb';
const IS_SANDBOX = import.meta.env.VITE_PAYPAL_SANDBOX === 'true';

// Siempre mostrar el botón (el SDK de PayPal maneja errores)
const isPayPalConfigured = true;

interface RegisterData {
  businessName: string;
  ruc: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  plan: string;
  businessType: string;
}

interface Toast {
  id: string;
  text: string;
  type: 'success' | 'error' | 'info';
}

const SubscriptionPage: React.FC = () => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedBusinessType, setSelectedBusinessType] = useState<BusinessType>('GENERAL');
  const [step, setStep] = useState<'plans' | 'businessType' | 'register'>('plans');
  const [paymentMethod, setPaymentMethod] = useState<'PAYPAL' | 'TRANSFER'>('PAYPAL');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [currentPlanIndex, setCurrentPlanIndex] = useState(0);
  const [paymentSettings, setPaymentSettings] = useState({ paypalEnabled: true, transferEnabled: true, cardEnabled: false });

  useEffect(() => {
    fetch(`${API_URL}/api/admin/settings`)
      .then(r => r.json())
      .then(d => {
        if (d) {
          const settings = {
            paypalEnabled: d.paypalEnabled !== false,
            transferEnabled: d.transferEnabled !== false,
            cardEnabled: d.cardEnabled || false
          };
          setPaymentSettings(settings);
          setPaymentMethod(current => {
             if (current === 'PAYPAL' && !settings.paypalEnabled) return settings.transferEnabled ? 'TRANSFER' : 'PAYPAL';
             if (current === 'TRANSFER' && !settings.transferEnabled) return settings.paypalEnabled ? 'PAYPAL' : 'TRANSFER';
             return current;
          });
        }
      })
      .catch(() => {});
  }, []);
  
  // Estado para modo oscuro - detectar preferencia del sistema
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('subscriptionPageDarkMode');
    if (saved !== null) return JSON.parse(saved);
    return false; // Desactivado por defecto a petición del usuario
  });

  // Aplicar modo oscuro al documento
  useEffect(() => {
    localStorage.setItem('subscriptionPageDarkMode', JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  // Función para recargar planes
  const reloadPlans = async () => {
    // Siempre cargar desde el API para obtener precios actualizados
    try {
      const API_URL = import.meta.env.VITE_BACKEND_URL || '';
      const response = await fetch(`${API_URL}/api/subscription-plans`);
      if (response.ok) {
        const data = await response.json();
        if (data.plans && data.plans.length > 0) {
          // Filtrar planes activos (no guardamos en localStorage)
          const filteredPlans = data.plans.filter((p: SubscriptionPlan) => p.isActive);
          setPlans(filteredPlans);
          return;
        }
      }
    } catch (error) {
      console.error('Error recargando planes:', error);
    }
    
    // Solo si el backend falla completamente, usar planes por defecto
    setPlans(getDefaultPlans());
  };

  // Escuchar cambios para recargar planes desde el backend
  useEffect(() => {
    // Recargar cada 30 segundos para mantener datos actualizados
    const interval = setInterval(() => {
      reloadPlans();
    }, 30000); // Verificar cada 30 segundos
    
    // Escuchar evento de actualización de planes desde otras páginas
    const handlePlansUpdate = () => {
      reloadPlans();
    };
    
    // Verificar si hubo actualizaciones mientras la página estaba oculta
    const checkForUpdates = () => {
      const lastUpdate = localStorage.getItem('plans_updated');
      if (lastUpdate) {
        const updateTime = parseInt(lastUpdate);
        const pageLoadTime = parseInt(sessionStorage.getItem('page_load_time') || '0');
        if (updateTime > pageLoadTime) {
          reloadPlans();
        }
      }
    };
    
    // Guardar tiempo de carga de la página
    sessionStorage.setItem('page_load_time', Date.now().toString());
    
    // Verificar inmediatamente si hay actualizaciones
    checkForUpdates();
    
    // Listener para storage (detecta cambios en localStorage de otras pestañas)
    window.addEventListener('storage', handlePlansUpdate);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handlePlansUpdate);
    };
  }, []);

  // Cargar planes desde el API
  useEffect(() => {
    const loadPlans = async () => {
      // Siempre cargar desde el API para obtener precios actualizados
      try {
        const API_URL = import.meta.env.VITE_BACKEND_URL || '';
        const response = await fetch(`${API_URL}/api/subscription-plans`);
        if (response.ok) {
          const data = await response.json();
          if (data.plans && data.plans.length > 0) {
            // Los precios del backend ya incluyen IVA
            const filteredPlans = data.plans.filter((p: SubscriptionPlan) => p.isActive);
            setPlans(filteredPlans);
            setLoadingPlans(false);
            return;
          }
        }
      } catch (error) {
        console.error('Error cargando planes:', error);
      }
      
      // Solo si el backend falla completamente, usar planes por defecto
      setPlans(getDefaultPlans());
      setLoadingPlans(false);
    };
    loadPlans();
  }, []);

  // Planes por defecto (fallback) - precios con IVA 15%
  const getDefaultPlans = (): SubscriptionPlan[] => [
    { id: '1', code: 'FREE', name: 'Plan Gratuito', description: 'Plan gratuito para pruebas y micro-emprendedores', price: 0, period: 'mensual', durationDays: 30, features: ['1 empresa', '10 facturas/mes'], maxBusinesses: 1, maxInvoicesPerMonth: 10, hasAIAssistant: false, hasPrioritySupport: false, isActive: true },
    { id: '2', code: 'BASIC', name: 'Plan Básico', description: 'Plan básico para pequeñas empresas', price: 34.49, period: 'mensual', durationDays: 30, features: ['1 empresa', '100 facturas/mes', 'Reportes básicos'], maxBusinesses: 1, maxInvoicesPerMonth: 100, hasAIAssistant: false, hasPrioritySupport: false, isActive: true },
    { id: '3', code: 'GASTRONOMICO', name: 'Plan Gastronómico', description: 'Para restaurantes, panaderías y cafeterías', price: 91.99, period: 'mensual', durationDays: 30, features: ['1 empresa', '300 facturas/mes', 'Caja POS', 'Recetas', 'Asistente IA'], maxBusinesses: 1, maxInvoicesPerMonth: 300, hasAIAssistant: true, hasPrioritySupport: true, isActive: true },
    { id: '4', code: 'PRO', name: 'Plan Profesional', description: 'Plan profesional para negocios en crecimiento', price: 172.49, period: 'mensual', durationDays: 30, features: ['3 empresas', '500 facturas/mes', 'Asistente IA', 'Soporte prioritario'], maxBusinesses: 3, maxInvoicesPerMonth: 500, hasAIAssistant: true, hasPrioritySupport: true, isActive: true },
    { id: '5', code: 'ENTERPRISE', name: 'Plan Empresarial', description: 'Plan empresarial para grandes organizaciones', price: 287.49, period: 'mensual', durationDays: 30, features: ['10 empresas', '2000 facturas/mes', 'API Access', 'Soporte 24/7'], maxBusinesses: 10, maxInvoicesPerMonth: 2000, hasAIAssistant: true, hasPrioritySupport: true, isActive: true }
  ];

  const [formData, setFormData] = useState<RegisterData>({
    businessName: '',
    ruc: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    plan: 'MONTHLY',
    businessType: 'GENERAL'
  });

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [transferReference, setTransferReference] = useState('');
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);

  // Validar RUC: Debe tener 13 dígitos numéricos
  const isValidRuc = (ruc: string) => /^\d{13}$/.test(ruc);

  // Validar Contraseña: Mínimo 8 caracteres, una mayúscula y un número
  const isValidPassword = (pass: string) => /^(?=.*[A-Z])(?=.*\d).{8,}$/.test(pass);

  const isFormValid = Object.values(formData).every((value) => (value as string).trim() !== '') && isValidRuc(formData.ruc) && isValidPassword(formData.password);

  const showNotify = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const handlePlanSelect = (plan: string) => {
    setSelectedPlan(plan);
    setStep('businessType');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBusinessTypeSelect = (type: BusinessType) => {
    setSelectedBusinessType(type);
    setFormData({ ...formData, businessType: type });
    setStep('register');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (paymentId?: string): Promise<any> => {
    setLoading(true);
    try {

      const API_URL = import.meta.env.VITE_BACKEND_URL || '';
      const response = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          plan: selectedPlan,
          businessType: selectedBusinessType,
          paymentMethod: paymentMethod,
          paymentId: paymentId // Solo si es PayPal
        })
      });

      const data = await response.json();

      if (data.success) {
        // Guardar token
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminUser', JSON.stringify(data.user));

        if (paymentMethod === 'PAYPAL' || paymentMethod === 'FREE') {
          showNotify(paymentMethod === 'FREE' ? '¡Cuenta gratuita activada! Bienvenido.' : '¡Cuenta creada exitosamente! Bienvenido.', 'success');
          setTimeout(() => { window.location.href = '/'; }, 2000);
        }
        return data;
      } else {
        showNotify('Error: ' + data.message, 'error');
        return null;
      }
    } catch (error) {
      console.error(error);
      showNotify('Error de conexión con el servidor.', 'error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleTransferRegister = async () => {
    setLoading(true);
    
    // Paso 1: Registrar la empresa (queda pendiente)
    const registerData = await handleRegister();
    if (!registerData) {
      setLoading(false);
      return;
    }

    const activationId = registerData.activationRequestId;

    // Paso 2: Si hay comprobante y tenemos el ID, subirlo
    if (paymentProofFile && activationId) {
      setUploadingProof(true);
      try {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(paymentProofFile);
        });

        const base64 = await base64Promise;
        const API_URL = import.meta.env.VITE_BACKEND_URL || '';
        const token = localStorage.getItem('adminToken');

        await fetch(`${API_URL}/api/activation-requests/${activationId}/upload-proof`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            paymentProofUrl: base64,
            paymentProofName: paymentProofFile.name,
            referenceNumber: transferReference || null
          })
        });

        showNotify('Comprobante subido correctamente.', 'success');
      } catch (err) {
        console.error('Error subiendo comprobante:', err);
        showNotify('Registro exitoso, pero no se pudo subir el comprobante. Contacte al administrador.', 'error');
      } finally {
        setUploadingProof(false);
      }
    }

    setLoading(false);
    
    // Redirigir al dashboard
    showNotify('Registro exitoso. Su cuenta está pendiente de aprobación.', 'info');
    setTimeout(() => { window.location.href = '/'; }, 2500);
  };

  return (
    <div className="bg-[#f6f6f8] dark:bg-[#101622] font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200 min-h-screen flex flex-col">
      {/* Navigation Bar */}
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4 lg:px-40 sticky top-0 z-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setStep('plans')}>
          <div className="w-8 h-8 text-[#135bec]">
            <svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 4H17.3334V17.3334H30.6666V30.6666H44V44H4V4Z"></path>
            </svg>
          </div>
          <h2 className="text-slate-900 dark:text-white text-xl font-black leading-tight tracking-tight">EcuaFact Pro</h2>
        </div>
        <div className="flex flex-1 justify-end gap-4 lg:gap-8 items-center">
          <nav className="hidden md:flex items-center gap-8">
            <a className="text-slate-600 dark:text-slate-300 text-sm font-medium hover:text-[#135bec] transition-colors" href="#" onClick={() => setStep('plans')}>Planes</a>
            <a className="text-slate-600 dark:text-slate-300 text-sm font-medium hover:text-[#135bec] transition-colors" href="#">Características</a>
          </nav>
          <div className="flex gap-2">
            <button onClick={() => window.location.href = '/'} className="flex min-w-[100px] cursor-pointer items-center justify-center rounded-lg h-10 px-4 bg-[#135bec] text-white text-sm font-bold tracking-tight hover:bg-[#135bec]/90 transition-all">
              Iniciar Sesión
            </button>
            <button 
              onClick={toggleDarkMode} 
              className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all ${isDarkMode ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              title={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {isDarkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 justify-center py-12 px-6 lg:px-40">
        <div className="max-w-[1100px] w-full flex flex-col gap-12">

          {step === 'plans' ? (
            <>
              {/* Header Text */}
              <div className="flex flex-col gap-4 text-center max-w-2xl mx-auto">
                <h1 className="text-slate-900 dark:text-white text-4xl lg:text-5xl font-black leading-tight tracking-tighter">
                  Elige el plan ideal para tu negocio
                </h1>
                <p className="text-slate-600 dark:text-slate-400 text-lg">
                  Optimiza tu facturación electrónica con el respaldo de la plataforma líder en cumplimiento del SRI. Sin complicaciones, 100% digital.
                </p>
              </div>

              {/* Pricing Grid - Planes Dinámicos */}
              {loadingPlans ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin text-4xl">⏳</div>
                  <p className="text-slate-500 ml-2">Cargando planes...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8 w-full">
                  {plans.map((plan, index) => (
                    <div 
                      key={plan.id} 
                      className="w-full"
                    >
                      <div 
                        className={`flex flex-col gap-6 rounded-xl border h-full ${index === 1 ? 'border-2 border-[#135bec] bg-white dark:bg-slate-900 p-6 md:p-8 shadow-xl transform md:scale-105 z-10' : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow'} ${!plan.isActive ? 'opacity-50' : ''}`}
                      >
                        {index === 1 && (
                          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#135bec] text-white text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-widest">
                            Popular
                          </div>
                        )}
                        <div className="flex flex-col gap-2">
                          <h3 className={`${index === 1 ? 'text-[#135bec]' : 'text-slate-600 dark:text-slate-400'} text-sm font-bold uppercase tracking-widest`}>{plan.name}</h3>
                          <div className="flex items-baseline gap-1">
                            <span className="text-slate-900 dark:text-white text-5xl font-black tracking-tighter">${plan.price.toFixed(2)}</span>
                            <span className="text-slate-500 text-lg font-medium">/{plan.period}</span>
                          </div>
                          <p className={index === 1 ? 'text-[#135bec]/80 text-sm font-semibold mt-2' : 'text-slate-500 text-sm mt-2 leading-relaxed'}>
                            {plan.description}
                          </p>
                        </div>
                        <hr className="border-slate-100 dark:border-slate-800" />
                        <div className="flex flex-col gap-4 min-h-[180px]">
                          {plan.features.slice(0, 5).map((feat, i) => (
                            <div key={i} className="flex items-center gap-3 text-slate-700 dark:text-slate-300 text-sm">
                              <CheckCircleIcon className="w-5 h-5 text-[#135bec]" />
                              {feat}
                            </div>
                          ))}
                          {plan.features.length > 5 && (
                            <p className="text-slate-400 text-xs">+{plan.features.length - 5} más características</p>
                          )}
                        </div>
                        <button 
                          onClick={() => handlePlanSelect(plan.code)} 
                          disabled={!plan.isActive}
                          className={`w-full flex items-center justify-center rounded-xl h-12 font-bold transition-all ${
                            index === 1 
                              ? 'bg-[#135bec] text-white hover:shadow-lg hover:shadow-[#135bec]/30' 
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700'
                          } ${!plan.isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {plan.isActive ? (index === 1 ? 'Obtener Oferta' : 'Suscribirse Ahora') : 'No disponible'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Payment Methods Info */}
              <div className="mt-10 flex flex-col gap-8 bg-white dark:bg-slate-900 rounded-2xl p-8 lg:p-12 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-slate-900 dark:text-white text-2xl font-black tracking-tight">Métodos de Pago Seguros</h2>
                    <p className="text-slate-500 text-sm mt-1">Transacciones encriptadas con seguridad SSL de nivel bancario.</p>
                  </div>
                  <div className="flex gap-2">
                    <LockClosedIcon className="w-6 h-6 text-slate-400" />
                    <ShieldCheckIcon className="w-6 h-6 text-slate-400" />
                    <ShieldCheckIcon className="w-6 h-6 text-slate-400" />
                  </div>
                </div>
                <div className="flex justify-center items-center gap-6 mt-4 opacity-60 flex-wrap">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Aceptamos:</span>
                  <div className="flex gap-4 items-center grayscale">
                    <img alt="PayPal" className="h-5" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDgY_uKrF4r9IIIemXjN0rV_VCF9nfY4-bobqcfhmUsyGmTxRqpHaoL0TjaWKiV_ZpYbKXwrzpoxpZ1Zy-btK6Lh35lq-pxVgRfM3zDf7cUSN9T-LrsbQeiBjpebvM2W0AmRkTzgVl5o49RUxxCA2LEbAa0oP1qDJuXaYKRRTRdf16DDK1WMR7qKdpDIHyREKDM-UFFxIUfa9P--HY4WrCFwjt0-FY9ROIdxmDV7D1g1ih0_xuWakWix4QNfnViMbL4MOFRt_blJgs" />
                    <img alt="Visa" className="h-4" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCUmRQquXFMTDsqpof-qCuy0ple9Y0BvSM7nQnigfZzT94kavm4y5xMl4PQncz952Ehlkv2_dwTexCPOdQ7zqacKfpCsLjtaTHiJeX1xThqDrjTPLCzIoJvskoNPZNc_AaVuCyIcuzhMaV0Due_ZceTcmlklNsD8OM6sjIrMsfVMgpLJG-wy5_GeARdS5_U1aaGl0zmSNk7RCZkWdXay_au2yZZbWfdTe36KZFa5As-M1qCf8lcqbcakEu-RqCcnebq49HSIpvNM2s" />
                    <img alt="Mastercard" className="h-6" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAmJfNbJqAwDYRwXL9fSKXS_5UukcGgGUawaey18zINdrnGMKBqW5HBTK05MuDa4dh1b8HQtx1vFNwRw_kq0DWs_1OwigP1p_L0c46RwA6QSmUhmXm5ItTsG39bMQRzSw7mS55rOKEks-IqAHVB_RVKNbKfb_-HS_i5XygOpkFF8ONeAWN_ULN7QLfCEzqUIYTTx9I3eIy-LE2dWlAXyapu4vhRX-MvBrwY21gFVRANRxIonXxhRUXj14IChDm5vfBRBz7_xTcEZnA" />
                  </div>
                </div>
              </div>
            </>
          ) : step === 'businessType' ? (
            /* Step 2: Selección de Tipo de Negocio */
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-4 text-center max-w-2xl mx-auto">
                <h1 className="text-slate-900 dark:text-white text-4xl lg:text-5xl font-black leading-tight tracking-tighter">
                  ¿Qué tipo de negocio tienes?
                </h1>
                <p className="text-slate-600 dark:text-slate-400 text-lg">
                  Activaremos solo los módulos que tu negocio necesita. Si tienes panadería o restaurante, tendrás control de recetas y producción.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
                {(Object.entries(BUSINESS_TYPES) as [BusinessType, typeof BUSINESS_TYPES[BusinessType]][]).map(([key, value]) => (
                  <button
                    key={key}
                    onClick={() => handleBusinessTypeSelect(key)}
                    className={`group relative bg-white dark:bg-slate-800 rounded-3xl p-6 border-2 transition-all duration-300 text-center hover:-translate-y-1 cursor-pointer ${
                      selectedBusinessType === key
                        ? 'border-[#135bec] shadow-2xl shadow-[#135bec]/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-[#135bec]/50 hover:shadow-xl'
                    }`}
                  >
                    <div className="text-4xl mb-4">{value.icon}</div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-white group-hover:text-[#135bec] transition-colors">{value.label}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{value.description}</p>
                  </button>
                ))}
              </div>

              <div className="text-center mt-4">
                <button
                  onClick={() => setStep('plans')}
                  className="text-sm text-slate-500 hover:text-[#135bec] inline-flex items-center gap-1"
                >
                  <ArrowLeftIcon className="w-4 h-4" /> Volver a planes
                </button>
              </div>
            </div>
          ) : (
            /* Registration Form */
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="mb-6">
                  <button onClick={() => setStep('businessType')} className="text-sm text-slate-500 hover:text-[#135bec] mb-4 flex items-center gap-1">
                    <ArrowLeftIcon className="w-4 h-4" /> Volver a tipo de negocio
                  </button>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">Crea tu cuenta de Empresa</h2>
                  <p className="text-slate-500 text-sm">Ingresa los datos para tu facturación electrónica.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Razón Social / Nombre</label>
                    <input name="businessName" value={formData.businessName} onChange={handleInputChange} className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-sm focus:ring-[#135bec]" placeholder="Ej. Mi Empresa S.A." />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">RUC</label>
                    <input name="ruc" value={formData.ruc} onChange={handleInputChange}
                      className={`w-full rounded-lg border bg-slate-50 dark:bg-slate-800 p-3 text-sm focus:ring-[#135bec] ${formData.ruc && !isValidRuc(formData.ruc) ? 'border-red-500 focus:border-red-500' : 'border-slate-300 dark:border-slate-700'
                        }`}
                      placeholder="179..." maxLength={13}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Teléfono</label>
                    <input name="phone" value={formData.phone} onChange={handleInputChange} className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-sm focus:ring-[#135bec]" placeholder="099..." />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Dirección</label>
                    <input name="address" value={formData.address} onChange={handleInputChange} className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-sm focus:ring-[#135bec]" placeholder="Dirección completa" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Correo Electrónico</label>
                    <input name="email" type="email" value={formData.email} onChange={handleInputChange} className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-sm focus:ring-[#135bec]" placeholder="tu.nombre@email.com" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Contraseña</label>
                    <div className="relative">
                      <input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleInputChange}
                        className={`w-full rounded-lg border bg-slate-50 dark:bg-slate-800 p-3 text-sm focus:ring-[#135bec] pr-10 ${formData.password && !isValidPassword(formData.password) ? 'border-red-500 focus:border-red-500' : 'border-slate-300 dark:border-slate-700'
                          }`}
                        placeholder="********"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                      </button>
                    </div>
                    {formData.password && !isValidPassword(formData.password) && <p className="text-xs text-red-500 mt-1">Mínimo 8 caracteres, una mayúscula y un número.</p>}
                  </div>
                </div>

                <div className="mb-6">
                  {(() => {
                    const currentPlan = plans.find(p => p.code === selectedPlan);
                    const isFreePlan = currentPlan?.price === 0;

                    if (isFreePlan) {
                      return (
                        <div className="space-y-4">
                          <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-4">
                            <p className="text-sm font-black text-emerald-700 dark:text-emerald-400">Plan Gratuito</p>
                            <p className="text-xs text-emerald-600 dark:text-emerald-300 mt-1">No se requiere pago. Su cuenta se activar� inmediatamente con {currentPlan?.durationDays || 30} d�as de acceso.</p>
                          </div>
                          <button
                            onClick={async () => {
                              setPaymentMethod('FREE');
                              await handleRegister();
                            }}
                            disabled={loading || !isFormValid}
                            className={`w-full flex items-center justify-center gap-2 rounded-xl h-12 font-bold transition-colors ${loading || !isFormValid
                                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                : 'bg-emerald-600 text-white hover:bg-emerald-500'
                              }`}
                          >
                            {loading ? 'Registrando...' : 'Activar Cuenta Gratuita'}
                          </button>
                        </div>
                      );
                    }

                    return (
                      <>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Método de Pago</h3>
                    {paymentSettings.paypalEnabled && (
                    <div
                      onClick={() => setPaymentMethod('PAYPAL')}
                      className={`cursor-pointer flex items-center gap-3 p-4 rounded-xl border transition-all ${paymentMethod === 'PAYPAL' ? 'border-[#135bec] bg-[#135bec]/5' : 'border-slate-200 dark:border-slate-800'}`}
                    >
                      <CreditCardIcon className="w-5 h-5 text-[#135bec]" />
                      <div>
                        <p className="font-bold text-sm dark:text-white">PayPal / Tarjeta</p>
                        <p className="text-xs text-slate-500">Activación inmediata</p>
                      </div>
                    </div>
                    )}
                    {paymentSettings.transferEnabled && (
                    <div
                      onClick={() => setPaymentMethod('TRANSFER')}
                      className={`cursor-pointer flex items-center gap-3 p-4 rounded-xl border transition-all ${paymentMethod === 'TRANSFER' ? 'border-[#135bec] bg-[#135bec]/5' : 'border-slate-200 dark:border-slate-800'}`}
                    >
                      <BuildingLibraryIcon className="w-5 h-5 text-[#135bec]" />
                      <div>
                        <p className="font-bold text-sm dark:text-white">Transferencia</p>
                        <p className="text-xs text-slate-500">Aprobación manual (24-48h)</p>
                      </div>
                    </div>
                    )}
                    </>
                  );
                })()}
              </div>

                {paymentMethod === 'PAYPAL' ? (
                  <div className="mt-4">
                    {!isPayPalConfigured ? (
                      <div className="w-full py-4 px-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl text-center">
                        <p className="text-amber-700 dark:text-amber-400 text-sm font-medium">
                          ⚠️ PayPal no está configurado
                        </p>
                        <p className="text-amber-600 dark:text-amber-500 text-xs mt-1">
                          Configure VITE_PAYPAL_CLIENT_ID en el archivo .env
                        </p>
                      </div>
                    ) : (
                      <PayPalScriptProvider 
                        options={{ 
                          clientId: PAYPAL_CLIENT_ID, 
                          currency: "USD",
                          intent: "capture",
                          debug: IS_SANDBOX,
                          locale: "es_EC",
                          buyerCountry: "EC",
                          "enable-funding": "card"
                        }}
                      >
                        <PayPalButtons
                          style={{ layout: "vertical" }}
                          disabled={!isFormValid}
                          createOrder={(data, actions) => {
                            const currentPlan = plans.find(p => p.code === selectedPlan);
                            const price = currentPlan ? currentPlan.price.toFixed(2) : '0.00';
                            return actions.order.create({
                              intent: "CAPTURE",
                              payer: {
                                address: {
                                  country_code: "EC"
                                }
                              },
                              application_context: {
                                shipping_preference: "NO_SHIPPING",
                                landing_page: "BILLING"
                              },
                              purchase_units: [{
                                amount: { currency_code: "USD", value: price },
                                description: `Suscripción EcuaFact Pro - ${(() => {
                                  const currentPlan = plans.find(p => p.code === selectedPlan);
                                  return currentPlan ? currentPlan.name : 'Plan';
                                })()}`
                              }]
                            });
                          }}
                          onApprove={async (data, actions) => {
                            try {
                              if (actions.order) {
                                const details = await actions.order.capture();
                                console.log('Payment captured:', details);
                                handleRegister(details.id);
                              }
                            } catch (error) {
                              console.error('Error capturing payment:', error);
                              showNotify('Error al procesar el pago. Por favor intente de nuevo.', 'error');
                            }
                          }}
                          onError={(err) => {
                            console.error('PayPal Error:', err);
                            showNotify('Error de conexión con PayPal. Verifique su conexión e intente de nuevo.', 'error');
                          }}
                          onCancel={() => {
                            showNotify('Pago cancelado. Puede intentar de nuevo.', 'info');
                          }}
                        />
                      </PayPalScriptProvider>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Datos bancarios */}
                    <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl p-4 space-y-2">
                      <p className="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest">Datos para la transferencia</p>
                      <BankDetails />
                    </div>

                    {/* Número de referencia */}
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">N° de Referencia / Comprobante</label>
                      <input
                        type="text"
                        value={transferReference}
                        onChange={e => setTransferReference(e.target.value)}
                        className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-sm focus:ring-[#135bec]"
                        placeholder="Ej. 00123456789"
                      />
                    </div>

                    {/* Subir comprobante */}
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Foto del Comprobante de Pago</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setPaymentProofFile(file);
                            const reader = new FileReader();
                            reader.onloadend = () => setPaymentProofPreview(reader.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-sm focus:ring-[#135bec] file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200"
                      />
                      {paymentProofPreview && (
                        <div className="mt-2 relative">
                          <img src={paymentProofPreview} alt="Comprobante" className="w-full max-h-40 object-cover rounded-lg border border-slate-200 dark:border-slate-700" />
                          <button
                            onClick={() => { setPaymentProofFile(null); setPaymentProofPreview(null); }}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold"
                          >×</button>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleTransferRegister}
                      disabled={loading || uploadingProof || !isFormValid}
                      className={`w-full flex items-center justify-center gap-2 rounded-xl h-12 font-bold transition-colors ${loading || uploadingProof || !isFormValid
                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                          : 'bg-[#135bec] text-white hover:bg-[#135bec]/90'
                        }`}
                    >
                      {loading || uploadingProof ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="animate-spin">⏳</span>
                          {uploadingProof ? 'Subiendo comprobante...' : 'Registrando...'}
                        </span>
                      ) : (
                        'Registrar y Enviar Comprobante'
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Order Summary */}
              <div className="lg:w-80">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 sticky top-24">
                  <h3 className="font-bold text-slate-900 dark:text-white mb-4">Resumen del Pedido</h3>
                  <div className="flex justify-between mb-2 text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Plan Seleccionado</span>
                    <span className="font-medium dark:text-white">
                      {(() => {
                        const currentPlan = plans.find(p => p.code === selectedPlan);
                        return currentPlan ? `${currentPlan.name} (${currentPlan.period})` : 'Plan desconocido';
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between mb-4 text-sm">
                    <span className="text-slate-600 dark:text-slate-400">Precio</span>
                    <span className="font-medium dark:text-white">
                      ${(() => {
                        const currentPlan = plans.find(p => p.code === selectedPlan);
                        return currentPlan ? currentPlan.price.toFixed(2) : '0.00';
                      })()}
                    </span>
                  </div>
                  <hr className="border-slate-200 dark:border-slate-700 mb-4" />
                  <div className="flex justify-between text-lg font-black text-slate-900 dark:text-white">
                    <span>Total</span>
                    <span>
                      ${(() => {
                        const currentPlan = plans.find(p => p.code === selectedPlan);
                        return currentPlan ? currentPlan.price.toFixed(2) : '0.00';
                      })()}
                    </span>
                  </div>
                  <div className="mt-4 text-xs text-slate-500 text-center">
                    Al suscribirte aceptas nuestros términos y condiciones de servicio.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Notice */}
          <div className="text-center text-slate-400 text-xs flex flex-col gap-2">
            <p>Precios expresados en dólares estadounidenses (USD) e incluyen IVA.</p>
            <p>© 2024 EcuaFact Pro - Facturación Electrónica Autorizada por el SRI.</p>
          </div>
        </div>
      </main>

      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-[999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto min-w-[320px] p-6 rounded-[2.5rem] shadow-2xl backdrop-blur-xl border animate-in slide-in-from-right-10 flex items-start gap-4 text-white ${toast.type === 'error' ? 'bg-red-500/90 border-red-500/50' : 'bg-[#135bec]/90 border-[#135bec]/50'
              }`}
          >
            <span className="text-2xl">{toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}</span>
            <p className="font-black text-sm leading-tight mt-1">{toast.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubscriptionPage;
