import React, { useState, useEffect } from 'react';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import {
  CheckCircleIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  ArrowLeftIcon,
  EyeIcon,
  EyeSlashIcon,
  CreditCardIcon,
  BuildingLibraryIcon,
  SunIcon,
  MoonIcon,
  DocumentTextIcon,
  StarIcon,
  FireIcon,
  BuildingStorefrontIcon,
  ShoppingBagIcon,
  WrenchScrewdriverIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline';
import { BUSINESS_TYPES, BusinessType } from '../../../types/types';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

const businessTypeIcons: Record<string, { Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; color: string; bg: string; activeBg: string }> = {
  BAKERY:     { Icon: FireIcon,               color: 'text-amber-600',  bg: 'bg-amber-50',   activeBg: 'bg-amber-100' },
  RESTAURANT: { Icon: BuildingStorefrontIcon, color: 'text-rose-600',   bg: 'bg-rose-50',    activeBg: 'bg-rose-100' },
  STORE:      { Icon: ShoppingBagIcon,        color: 'text-violet-600', bg: 'bg-violet-50',  activeBg: 'bg-violet-100' },
  SERVICE:    { Icon: WrenchScrewdriverIcon,  color: 'text-sky-600',    bg: 'bg-sky-50',     activeBg: 'bg-sky-100' },
  GENERAL:    { Icon: BuildingOffice2Icon,    color: 'text-[#0057FF]',  bg: 'bg-blue-50',   activeBg: 'bg-blue-100' },
};

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
    return <div className="text-xs text-slate-600 space-y-1">
      <p><strong>Banco:</strong> Banco Pichincha</p>
      <p><strong>Cuenta:</strong> 1234567890</p>
    </div>;
  }
  return (
    <div className="space-y-3">
      {accounts.map((bank: any) => (
        <div key={bank.id} className="text-xs text-slate-600 space-y-1 p-3 bg-slate-50 rounded-lg border border-slate-200">
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

const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || 'sb';
const IS_SANDBOX = import.meta.env.VITE_PAYPAL_SANDBOX === 'true';
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
  const urlParams = new URLSearchParams(window.location.search);
  const planFromUrl = urlParams.get('plan');

  const [selectedPlan, setSelectedPlan] = useState<string | null>(planFromUrl);
  const [selectedBusinessType, setSelectedBusinessType] = useState<BusinessType>('GENERAL');
  const [step, setStep] = useState<'plans' | 'businessType' | 'register'>(planFromUrl ? 'businessType' : 'plans');
  const [paymentMethod, setPaymentMethod] = useState<'PAYPAL' | 'TRANSFER'>('PAYPAL');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
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

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('subscriptionPageDarkMode');
    if (saved !== null) return JSON.parse(saved);
    return false;
  });

  useEffect(() => {
    localStorage.setItem('subscriptionPageDarkMode', JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const reloadPlans = async () => {
    try {
      const response = await fetch(`${API_URL}/api/subscription-plans`);
      if (response.ok) {
        const data = await response.json();
        if (data.plans && data.plans.length > 0) {
          const filteredPlans = data.plans.filter((p: SubscriptionPlan) => p.isActive);
          setPlans(filteredPlans);
          return;
        }
      }
    } catch (error) {
      console.error('Error recargando planes:', error);
    }
    setPlans(getDefaultPlans());
  };

  useEffect(() => {
    const interval = setInterval(() => { reloadPlans(); }, 30000);
    const handlePlansUpdate = () => { reloadPlans(); };
    const checkForUpdates = () => {
      const lastUpdate = localStorage.getItem('plans_updated');
      if (lastUpdate) {
        const updateTime = parseInt(lastUpdate);
        const pageLoadTime = parseInt(sessionStorage.getItem('page_load_time') || '0');
        if (updateTime > pageLoadTime) { reloadPlans(); }
      }
    };
    sessionStorage.setItem('page_load_time', Date.now().toString());
    checkForUpdates();
    window.addEventListener('storage', handlePlansUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handlePlansUpdate);
    };
  }, []);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const response = await fetch(`${API_URL}/api/subscription-plans`);
        if (response.ok) {
          const data = await response.json();
          if (data.plans && data.plans.length > 0) {
            const filteredPlans = data.plans.filter((p: SubscriptionPlan) => p.isActive);
            setPlans(filteredPlans);
            setLoadingPlans(false);
            return;
          }
        }
      } catch (error) {
        console.error('Error cargando planes:', error);
      }
      setPlans(getDefaultPlans());
      setLoadingPlans(false);
    };
    loadPlans();
  }, []);

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

  const isValidRuc = (ruc: string) => /^\d{13}$/.test(ruc);
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
      const response = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          plan: selectedPlan,
          businessType: selectedBusinessType,
          paymentMethod: paymentMethod,
          paymentId: paymentId
        })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminUser', JSON.stringify(data.user));

        if (paymentMethod === 'PAYPAL' || paymentMethod === 'FREE') {
          showNotify(paymentMethod === 'FREE' ? 'Cuenta gratuita activada! Bienvenido.' : 'Cuenta creada exitosamente! Bienvenido.', 'success');
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
    const registerData = await handleRegister();
    if (!registerData) {
      setLoading(false);
      return;
    }

    const activationId = registerData.activationRequestId;

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
    showNotify('Registro exitoso. Su cuenta está pendiente de aprobación.', 'info');
    setTimeout(() => { window.location.href = '/'; }, 2500);
  };

  return (
    <div className="bg-[#F8F9FC] text-slate-900 min-h-screen flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 bg-white px-6 py-4 lg:px-40 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setStep('plans')}>
          <div className="w-10 h-10 bg-[#0057FF] rounded-xl flex items-center justify-center shadow-lg shadow-[#0057FF]/20">
            <DocumentTextIcon className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-slate-900 text-xl font-extrabold leading-tight tracking-tight">Ecuafact Pro</h2>
        </div>
        <div className="flex flex-1 justify-end gap-4 lg:gap-8 items-center">
          <nav className="hidden md:flex items-center gap-8">
            <a className="text-slate-600 text-sm font-semibold hover:text-[#0057FF] transition-colors" href="#" onClick={() => setStep('plans')}>Planes</a>
            <a className="text-slate-600 text-sm font-semibold hover:text-[#0057FF] transition-colors" href="#">Características</a>
            <a className="text-slate-600 text-sm font-semibold hover:text-[#0057FF] transition-colors" href="#">Soporte</a>
          </nav>
          <div className="flex gap-2">
            <button onClick={() => window.location.href = '/'} className="flex min-w-[100px] cursor-pointer items-center justify-center rounded-xl h-10 px-4 bg-[#0057FF] text-white text-sm font-bold tracking-tight hover:bg-[#003ACC] transition-all shadow-md shadow-[#0057FF]/20">
              Inicio
            </button>
            <button onClick={() => window.location.href = '/login'} className="flex cursor-pointer items-center justify-center rounded-xl h-10 px-4 border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-all">
              Iniciar Sesión
            </button>
          </div>
        </div>
      </header>

      <main className="flex flex-1 justify-center py-12 px-6 lg:px-40">
        <div className="max-w-[1100px] w-full flex flex-col gap-12">

          {step === 'plans' ? (
            <>
              <div className="flex flex-col gap-4 text-center max-w-2xl mx-auto">
                <h1 className="text-slate-900 text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight">
                  Elige el plan ideal para tu negocio
                </h1>
                <p className="text-slate-500 text-lg font-medium">
                  Optimiza tu facturación electrónica con la plataforma líder en cumplimiento del SRI. Sin complicaciones, 100% digital.
                </p>
              </div>

              {/* Pricing Grid */}
              {loadingPlans ? (
                <div className="flex justify-center py-12 gap-4 items-center">
                  <div className="animate-spin text-3xl">&#9203;</div>
                  <p className="text-slate-500 font-medium">Cargando planes...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8 w-full">
                  {plans.map((plan, index) => {
                    const isPopular = index === 1;
                    return (
                    <div key={plan.id} className="w-full relative">
                      <div
                        className={`flex flex-col gap-6 rounded-2xl border h-full ${
                          isPopular
                            ? 'border-[#0057FF] bg-white p-6 md:p-8 shadow-2xl shadow-[#0057FF]/10 transform md:scale-105 z-10 ring-1 ring-[#0057FF]/20'
                            : 'border border-slate-200 bg-white p-6 md:p-8 shadow-sm hover:shadow-lg transition-shadow'
                        } ${!plan.isActive ? 'opacity-50' : ''}`}
                      >
                        {isPopular && (
                          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#FF6B35] text-white text-xs font-extrabold px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg shadow-[#FF6B35]/25">
                            Más Popular
                          </div>
                        )}
                        <div className="flex flex-col gap-2">
                          <h3 className={`${isPopular ? 'text-[#0057FF]' : 'text-slate-500'} text-sm font-extrabold uppercase tracking-widest`}>
                            {plan.name}
                          </h3>
                          <div className="flex items-baseline gap-1">
                            <span className="text-slate-900 text-5xl font-extrabold tracking-tighter">
                              {plan.price === 0 ? 'Gratis' : `$${plan.price.toFixed(2)}`}
                            </span>
                            <span className="text-slate-400 text-lg font-semibold">
                              /{plan.period}
                            </span>
                          </div>
                          <p className={`text-sm mt-2 leading-relaxed font-medium ${isPopular ? 'text-[#0057FF]/80' : 'text-slate-500'}`}>
                            {plan.description}
                          </p>
                        </div>
                        <hr className="border-slate-100" />
                        <div className="flex flex-col gap-4 min-h-[180px]">
                          {plan.features.slice(0, 5).map((feat, i) => (
                            <div key={i} className="flex items-center gap-3 text-slate-700 text-sm font-medium">
                              <CheckCircleIcon className="w-5 h-5 text-[#10B981] flex-shrink-0" />
                              {feat}
                            </div>
                          ))}
                          {plan.features.length > 5 && (
                            <p className="text-slate-400 text-xs font-medium">+{plan.features.length - 5} más características</p>
                          )}
                        </div>
                        <button
                          onClick={() => handlePlanSelect(plan.code)}
                          disabled={!plan.isActive}
                          className={`w-full flex items-center justify-center rounded-xl h-12 font-bold transition-all ${
                            isPopular
                              ? 'bg-[#0057FF] text-white hover:bg-[#003ACC] shadow-lg shadow-[#0057FF]/25 hover:-translate-y-0.5'
                              : 'bg-[#F8F9FC] text-slate-700 hover:bg-slate-100'
                          } ${!plan.isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {plan.isActive ? (isPopular ? 'Obtener Oferta' : 'Suscribirse Ahora') : 'No disponible'}
                        </button>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}

              {/* Trust badges */}
              <div className="mt-8 flex flex-col gap-8 bg-white rounded-2xl p-8 lg:p-12 border border-slate-200 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-slate-900 text-2xl font-extrabold tracking-tight">Métodos de Pago Seguros</h2>
                    <p className="text-slate-500 text-sm mt-1 font-medium">Transacciones encriptadas con seguridad SSL de nivel bancario.</p>
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
                    <span className="text-sm font-extrabold text-slate-600">PayPal</span>
                    <span className="text-sm font-extrabold text-slate-600">Visa</span>
                    <span className="text-sm font-extrabold text-slate-600">Mastercard</span>
                    <span className="text-sm font-extrabold text-slate-600">Transferencia</span>
                  </div>
                </div>
              </div>
            </>
          ) : step === 'businessType' ? (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-4 text-center max-w-2xl mx-auto">
                <h1 className="text-slate-900 text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight">
                  Qué tipo de negocio tienes?
                </h1>
                <p className="text-slate-500 text-lg font-medium">
                  Activaremos solo los módulos que tu negocio necesita. Si tienes panadería o restaurante, tendrás control de recetas y producción.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
                {(Object.entries(BUSINESS_TYPES) as [BusinessType, typeof BUSINESS_TYPES[BusinessType]][]).map(([key, value]) => {
                  const btIcon = businessTypeIcons[key] ?? businessTypeIcons['GENERAL'];
                  const { Icon, color, bg, activeBg } = btIcon;
                  const isSelected = selectedBusinessType === key;
                  return (
                    <button
                      key={key}
                      onClick={() => handleBusinessTypeSelect(key)}
                      className={`group relative bg-white rounded-3xl p-6 border-2 transition-all duration-300 text-center hover:-translate-y-1 cursor-pointer ${
                        isSelected
                          ? 'border-[#0057FF] shadow-2xl shadow-[#0057FF]/10'
                          : 'border-slate-200 hover:border-[#0057FF]/50 hover:shadow-xl'
                      }`}
                    >
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 transition-colors duration-300 ${isSelected ? activeBg : bg} group-hover:${activeBg}`}>
                        <Icon className={`w-8 h-8 ${color} transition-colors duration-300`} />
                      </div>
                      <h3 className="text-lg font-extrabold text-slate-800 group-hover:text-[#0057FF] transition-colors">{value.label}</h3>
                      <p className="text-sm text-slate-500 mt-2 leading-relaxed font-medium">{value.description}</p>
                    </button>
                  );
                })}
              </div>

              <div className="text-center mt-4">
                <button
                  onClick={() => setStep('plans')}
                  className="text-sm text-slate-500 hover:text-[#0057FF] inline-flex items-center gap-1 font-semibold"
                >
                  <ArrowLeftIcon className="w-4 h-4" /> Volver a planes
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-1 bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                <div className="mb-6">
                  <button onClick={() => setStep('businessType')} className="text-sm text-slate-500 hover:text-[#0057FF] mb-4 flex items-center gap-1 font-semibold">
                    <ArrowLeftIcon className="w-4 h-4" /> Volver a tipo de negocio
                  </button>
                  <h2 className="text-2xl font-extrabold text-slate-900">Crea tu cuenta de Empresa</h2>
                  <p className="text-slate-500 text-sm font-medium">Ingresa los datos para tu facturación electrónica.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-1">Razón Social / Nombre</label>
                    <input name="businessName" value={formData.businessName} onChange={handleInputChange} className="w-full rounded-xl border-slate-300 bg-slate-50 p-3 text-sm focus:ring-2 focus:ring-[#0057FF] focus:border-[#0057FF] font-medium" placeholder="Ej. Mi Empresa S.A." />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">RUC</label>
                    <input name="ruc" value={formData.ruc} onChange={handleInputChange}
                      className={`w-full rounded-xl border bg-slate-50 p-3 text-sm focus:ring-2 focus:ring-[#0057FF] font-medium ${formData.ruc && !isValidRuc(formData.ruc) ? 'border-red-500 focus:border-red-500' : 'border-slate-300'}`}
                      placeholder="179..." maxLength={13}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Teléfono</label>
                    <input name="phone" value={formData.phone} onChange={handleInputChange} className="w-full rounded-xl border-slate-300 bg-slate-50 p-3 text-sm focus:ring-2 focus:ring-[#0057FF] focus:border-[#0057FF] font-medium" placeholder="099..." />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-1">Dirección</label>
                    <input name="address" value={formData.address} onChange={handleInputChange} className="w-full rounded-xl border-slate-300 bg-slate-50 p-3 text-sm focus:ring-2 focus:ring-[#0057FF] focus:border-[#0057FF] font-medium" placeholder="Dirección completa" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-1">Correo Electrónico</label>
                    <input name="email" type="email" value={formData.email} onChange={handleInputChange} className="w-full rounded-xl border-slate-300 bg-slate-50 p-3 text-sm focus:ring-2 focus:ring-[#0057FF] focus:border-[#0057FF] font-medium" placeholder="tu.nombre@email.com" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-1">Contraseña</label>
                    <div className="relative">
                      <input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleInputChange}
                        className={`w-full rounded-xl border bg-slate-50 p-3 text-sm focus:ring-2 focus:ring-[#0057FF] pr-10 font-medium ${formData.password && !isValidPassword(formData.password) ? 'border-red-500 focus:border-red-500' : 'border-slate-300'}`}
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
                    {formData.password && !isValidPassword(formData.password) && <p className="text-xs text-red-500 mt-1 font-medium">Mínimo 8 caracteres, una mayúscula y un número.</p>}
                  </div>
                </div>

                <div className="mb-6">
                  {(() => {
                    const currentPlan = plans.find(p => p.code === selectedPlan);
                    const isFreePlan = currentPlan?.price === 0;

                    if (isFreePlan) {
                      return (
                        <div className="space-y-4">
                          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                            <p className="text-sm font-extrabold text-emerald-700">Plan Gratuito</p>
                            <p className="text-xs text-emerald-600 mt-1 font-medium">No se requiere pago. Su cuenta se activará inmediatamente con {currentPlan?.durationDays || 30} días de acceso.</p>
                          </div>
                          <button
                            onClick={async () => {
                              setPaymentMethod('FREE' as any);
                              await handleRegister();
                            }}
                            disabled={loading || !isFormValid}
                            className={`w-full flex items-center justify-center gap-2 rounded-xl h-12 font-bold transition-colors ${loading || !isFormValid
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                : 'bg-[#10B981] text-white hover:bg-emerald-600 shadow-lg shadow-[#10B981]/25'
                              }`}
                          >
                            {loading ? 'Registrando...' : 'Activar Cuenta Gratuita'}
                          </button>
                        </div>
                      );
                    }

                    return (
                      <>
                        <h3 className="text-lg font-extrabold text-slate-900 mb-3">Método de Pago</h3>
                        {paymentSettings.paypalEnabled && (
                          <div
                            onClick={() => setPaymentMethod('PAYPAL')}
                            className={`cursor-pointer flex items-center gap-3 p-4 rounded-xl border transition-all mb-2 ${
                              paymentMethod === 'PAYPAL'
                                ? 'border-[#0057FF] bg-[#0057FF]/5 ring-1 ring-[#0057FF]/20'
                                : 'border-slate-200 hover:border-[#0057FF]/30'
                            }`}
                          >
                            <CreditCardIcon className="w-5 h-5 text-[#0057FF]" />
                            <div>
                              <p className="font-bold text-sm">PayPal / Tarjeta</p>
                              <p className="text-xs text-slate-500 font-medium">Activación inmediata</p>
                            </div>
                          </div>
                        )}
                        {paymentSettings.transferEnabled && (
                          <div
                            onClick={() => setPaymentMethod('TRANSFER')}
                            className={`cursor-pointer flex items-center gap-3 p-4 rounded-xl border transition-all ${
                              paymentMethod === 'TRANSFER'
                                ? 'border-[#0057FF] bg-[#0057FF]/5 ring-1 ring-[#0057FF]/20'
                                : 'border-slate-200 hover:border-[#0057FF]/30'
                            }`}
                          >
                            <BuildingLibraryIcon className="w-5 h-5 text-[#0057FF]" />
                            <div>
                              <p className="font-bold text-sm">Transferencia</p>
                              <p className="text-xs text-slate-500 font-medium">Aprobación manual (24-48h)</p>
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
                      <div className="w-full py-4 px-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                        <p className="text-amber-700 text-sm font-semibold">PayPal no esta configurado</p>
                        <p className="text-amber-600 text-xs mt-1 font-medium">Configure VITE_PAYPAL_CLIENT_ID en el archivo .env</p>
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
                              payer: { address: { country_code: "EC" } },
                              application_context: { shipping_preference: "NO_SHIPPING", landing_page: "BILLING" },
                              purchase_units: [{
                                amount: { currency_code: "USD", value: price },
                                description: `Suscripción EcuaFact Pro - ${(() => {
                                  const cp = plans.find(p => p.code === selectedPlan);
                                  return cp ? cp.name : 'Plan';
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
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
                      <p className="text-xs font-extrabold text-blue-700 uppercase tracking-widest">Datos para la transferencia</p>
                      <BankDetails />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Nro. de Referencia / Comprobante</label>
                      <input
                        type="text"
                        value={transferReference}
                        onChange={e => setTransferReference(e.target.value)}
                        className="w-full rounded-xl border-slate-300 bg-slate-50 p-3 text-sm focus:ring-2 focus:ring-[#0057FF] focus:border-[#0057FF] font-medium"
                        placeholder="Ej. 00123456789"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Foto del Comprobante de Pago</label>
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
                        className="w-full rounded-xl border-slate-300 bg-slate-50 p-3 text-sm focus:ring-2 focus:ring-[#0057FF] file:mr-3 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-[#0057FF]/10 file:text-[#0057FF] hover:file:bg-[#0057FF]/20 font-medium"
                      />
                      {paymentProofPreview && (
                        <div className="mt-2 relative">
                          <img src={paymentProofPreview} alt="Comprobante" className="w-full max-h-40 object-cover rounded-xl border border-slate-200" />
                          <button
                            onClick={() => { setPaymentProofFile(null); setPaymentProofPreview(null); }}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold"
                          >x</button>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleTransferRegister}
                      disabled={loading || uploadingProof || !isFormValid}
                      className={`w-full flex items-center justify-center gap-2 rounded-xl h-12 font-bold transition-colors ${loading || uploadingProof || !isFormValid
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-[#0057FF] text-white hover:bg-[#003ACC] shadow-lg shadow-[#0057FF]/25'
                        }`}
                    >
                      {loading || uploadingProof ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="animate-spin">&#9203;</span>
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
                <div className="bg-[#F8F9FC] rounded-2xl p-6 border border-slate-200 sticky top-24">
                  <h3 className="font-extrabold text-slate-900 mb-4">Resumen del Pedido</h3>
                  <div className="flex justify-between mb-2 text-sm">
                    <span className="text-slate-500 font-medium">Plan Seleccionado</span>
                    <span className="font-semibold text-slate-900">
                      {(() => {
                        const cp = plans.find(p => p.code === selectedPlan);
                        return cp ? `${cp.name} (${cp.period})` : 'Plan desconocido';
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between mb-2 text-sm">
                    <span className="text-slate-500 font-medium">Tipo de Negocio</span>
                    <span className="font-semibold text-slate-900">{BUSINESS_TYPES[selectedBusinessType]?.label || 'General'}</span>
                  </div>
                  <div className="flex justify-between mb-4 text-sm">
                    <span className="text-slate-500 font-medium">Precio</span>
                    <span className="font-semibold text-slate-900">
                      ${(() => {
                        const cp = plans.find(p => p.code === selectedPlan);
                        return cp ? cp.price.toFixed(2) : '0.00';
                      })()}
                    </span>
                  </div>
                  <hr className="border-slate-200 mb-4" />
                  <div className="flex justify-between text-lg font-extrabold text-slate-900">
                    <span>Total</span>
                    <span>
                      ${(() => {
                        const cp = plans.find(p => p.code === selectedPlan);
                        return cp ? cp.price.toFixed(2) : '0.00';
                      })()}
                    </span>
                  </div>
                  <div className="mt-4 text-xs text-slate-400 text-center font-medium">
                    Al suscribirte aceptas nuestros términos y condiciones de servicio.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-slate-400 text-xs flex flex-col gap-2 font-medium">
            <p>Precios expresados en dólares estadounidenses (USD) e incluyen IVA.</p>
            <p>{new Date().getFullYear()} EcuaFact Pro - Facturación Electrónica Autorizada por el SRI.</p>
          </div>
        </div>
      </main>

      {/* Toasts */}
      <div className="fixed bottom-6 right-6 z-[999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto min-w-[320px] p-6 rounded-[2rem] shadow-2xl backdrop-blur-xl border flex items-start gap-4 text-white animate-fade-in ${
              toast.type === 'error' ? 'bg-red-500/90 border-red-500/50' :
              toast.type === 'info' ? 'bg-[#0057FF]/90 border-[#0057FF]/50' :
              'bg-[#10B981]/90 border-[#10B981]/50'
            }`}
          >
            <span className="text-2xl">{toast.type === 'success' ? 'OK' : toast.type === 'error' ? 'X' : 'i'}</span>
            <p className="font-extrabold text-sm leading-tight mt-1">{toast.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubscriptionPage;
