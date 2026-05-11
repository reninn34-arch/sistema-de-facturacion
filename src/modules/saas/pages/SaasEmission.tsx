import React, { useState, useEffect } from 'react';
import {
  BeakerIcon,
  CalendarDaysIcon,
  ClockIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  HomeIcon,
} from '@heroicons/react/24/outline';

// Interfaces
interface Business {
  id: string;
  name: string;
  ruc: string;
  email: string;
  subscriptionEnd: string | null;
  isActive: boolean;
  plan: string;
  subscriptionStart?: string | null;
  subscriptionStatus?: string;
  sriEnabled?: boolean;
  electronicSignature?: string;
}

interface SaasSubscription {
  id: string;
  code: string;
  name: string;
  description: string;
  price: number;
  period: string;
  durationDays: number;
  features: string[];
  isActive: boolean;
}

// Interface para facturas del SaaS
interface SaaSInvoice {
  id: string;
  numero: string;
  fecha: string;
  cliente: string;
  total: number;
  estado: string;
  plan?: string;
  daysAdded?: number;
}

interface SaasEmissionProps {
  businesses?: Business[];
  subscriptions?: SaasSubscription[];
  onNotify: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

// Datos de ejemplo para empresas
const sampleBusinesses: Business[] = [
  { id: '1', name: 'Empresa Demo S.A.', ruc: '1799999999001', email: 'demo@empresa.com', subscriptionEnd: '2026-03-01', isActive: true, plan: 'PRO', subscriptionStart: '2026-02-01', subscriptionStatus: 'ACTIVE' },
  { id: '2', name: 'Tech Solutions Ltda.', ruc: '1798888888001', email: 'tech@solutions.com', subscriptionEnd: '2026-06-01', isActive: true, plan: 'ENTERPRISE', subscriptionStart: '2026-01-01', subscriptionStatus: 'ACTIVE' },
  { id: '3', name: 'StartUp Ecuador', ruc: '1797777777001', email: 'info@startup.ec', subscriptionEnd: '2026-02-15', isActive: true, plan: 'FREE', subscriptionStart: '2026-01-15', subscriptionStatus: 'ACTIVE' }
];

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export default function SaasEmission({ businesses, subscriptions, onNotify }: SaasEmissionProps) {
  
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [selectedSubscription, setSelectedSubscription] = useState<SaasSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<SaasSubscription[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  
  // Estado para facturas desde la DB
  const [invoices, setInvoices] = useState<SaaSInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);

  // Recargar empresas cuando cambian las props
  useEffect(() => {
    if (Array.isArray(businesses) && businesses.length > 0) {
      // Las empresas ya se pasan desde App.tsx
    }
  }, [businesses]);

  // Cargar facturas desde el API
  useEffect(() => {
    const loadInvoices = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_URL}/api/admin/subscriptions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          // Las suscripciones están en data.subscriptions
          const subscriptionsList = Array.isArray(data.subscriptions) ? data.subscriptions : (Array.isArray(data) ? data : []);
          // Transformar las suscripciones al formato de facturas
          const transformedInvoices = subscriptionsList.map((sub: any) => ({
            id: sub.id,
            numero: sub.invoiceNumber || `SUB-${sub.id.substring(0, 8)}`,
            fecha: new Date(sub.startDate).toLocaleDateString('es-EC'),
            cliente: sub.business?.name || 'Empresa Desconocida',
            total: sub.amount || 0,
            estado: sub.status === 'ACTIVE' ? 'AUTORIZADA' : sub.status === 'SUSPENDED' ? 'PENDIENTE' : 'CANCELADA'
          }));
          setInvoices(transformedInvoices);
        } else {
          // Si falla, usar datos de ejemplo
          setInvoices(getDefaultInvoices());
        }
      } catch (error) {
        console.error('Error cargando facturas:', error);
        setInvoices(getDefaultInvoices());
      } finally {
        setLoadingInvoices(false);
      }
    };
    
    loadInvoices();
  }, []);

  // Datos de ejemplo para facturas (fallback)
  const getDefaultInvoices = (): SaaSInvoice[] => [
    { id: '1', numero: '001-001-0000001', fecha: '25/02/2026', cliente: 'Empresa Demo S.A.', total: 29.99, estado: 'AUTORIZADA' },
    { id: '2', numero: '001-001-0000000', fecha: '24/02/2026', cliente: 'Tech Solutions Ltda.', total: 149.99, estado: 'AUTORIZADA' }
  ];

  // Cargar planes desde el API
  useEffect(() => {
    const loadPlans = async () => {
      // Siempre cargar desde el API
      try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_URL}/api/subscription-plans`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (response.ok) {
          const data = await response.json();
          if (data.plans && data.plans.length > 0) {
            setPlans(data.plans.filter((p: SaasSubscription) => p.isActive));
          } else {
            setPlans(getDefaultSubscriptions());
          }
        } else {
          setPlans(getDefaultSubscriptions());
        }
      } catch (error) {
        console.error('Error cargando planes:', error);
        setPlans(getDefaultSubscriptions());
      } finally {
        setLoadingPlans(false);
      }
    };
    loadPlans();
  }, []);

  // Usar datos de ejemplo si no se proporcionan
  const businessList = Array.isArray(businesses) && businesses.length > 0 ? businesses : sampleBusinesses;

  // Planes por defecto si no hay suscripciones
  const getDefaultSubscriptions = (): SaasSubscription[] => [
    { id: '1', code: 'FREE', name: 'Plan Gratuito', description: 'Plan gratuito para pruebas', price: 0, period: 'mensual', durationDays: 30, features: ['1 empresa', '10 facturas/mes'], isActive: true },
    { id: '2', code: 'BASIC', name: 'Plan Básico', description: 'Plan básico para pequeñas empresas', price: 29.99, period: 'mensual', durationDays: 30, features: ['1 empresa', '100 facturas/mes'], isActive: true },
    { id: '3', code: 'GASTRONOMICO', name: 'Plan Gastronómico', description: 'Para restaurantes, panaderías y cafeterías', price: 79.99, period: 'mensual', durationDays: 30, features: ['1 empresa', '300 facturas/mes', 'Caja POS', 'Recetas', 'Asistente IA'], isActive: true },
    { id: '4', code: 'PRO', name: 'Plan Profesional', description: 'Plan profesional', price: 149.99, period: 'mensual', durationDays: 30, features: ['3 empresas', '500 facturas/mes', 'Asistente IA'], isActive: true },
    { id: '5', code: 'ENTERPRISE', name: 'Plan Empresarial', description: 'Plan empresarial', price: 249.99, period: 'mensual', durationDays: 30, features: ['10 empresas', '2000 facturas/mes', 'API Access', 'Soporte 24/7'], isActive: true },
    { id: '6', code: 'UNLIMITED', name: 'Plan Ilimitado', description: 'Plan ilimitado para superadmins', price: 0, period: 'indefinido', durationDays: 36500, features: ['Empresas ilimitadas', 'Facturas ilimitadas', 'Todas las funcionalidades'], isActive: true },
    { id: '7', code: 'PENDING', name: 'Pendiente', description: 'Suscripción pendiente de pago', price: 0, period: 'mensual', durationDays: 0, features: ['Sin acceso'], isActive: true }
  ];

  // Determinar las suscripciones activas
  const activeSubscriptions = plans.length > 0 ? plans : getDefaultSubscriptions();

  // Calcular días restantes de suscripción
  const calculateDaysRemaining = (endDate: string | null): number => {
    if (!endDate) return 0;
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  // Calcular nueva fecha de suscripción
  const calculateNewEndDate = (currentEnd: string | null, daysToAdd: number): string => {
    const now = new Date();
    let currentEndDate = currentEnd ? new Date(currentEnd) : now;
    
    // Si la suscripción ya terminó, comenzar desde hoy
    if (currentEndDate < now) {
      currentEndDate = now;
    }
    
    currentEndDate.setDate(currentEndDate.getDate() + daysToAdd);
    return currentEndDate.toLocaleDateString('es-EC');
  };

  // Hook para verificar si es la empresa demo
  const isDemoBusiness = (): boolean => {
    const userStr = localStorage.getItem('adminUser');
    if (!userStr) return false;
    try {
      const user = JSON.parse(userStr);
      return user?.email === 'empresa@pruebas.com' || user?.isDemo === true;
    } catch {
      return false;
    }
  };

  // Estado para el modo de emisión
  const [emissionMode, setEmissionMode] = useState<'LOCAL' | 'SRI'>('LOCAL');

  // Función para emitir factura en modo LOCAL (sin SRI)
  const handleEmitInvoiceLocal = async () => {
    if (!selectedBusiness || !selectedSubscription) {
      onNotify('Selecciona una empresa y un plan', 'warning');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch(`${API_URL}/api/admin/subscriptions/emit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          businessId: selectedBusiness.id,
          plan: selectedSubscription.code,
          durationDays: selectedSubscription.durationDays,
          amount: selectedSubscription.price,
          paymentMethod: 'LOCAL',
          mode: 'LOCAL'
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        const newInvoice: SaaSInvoice = {
          id: data.subscription?.id || Date.now().toString(),
          numero: data.invoice?.numero || `001-001-${Date.now()}`,
          fecha: data.invoice?.fecha || new Date().toLocaleDateString('es-EC'),
          cliente: selectedBusiness.name,
          total: selectedSubscription.price,
          estado: 'LOCAL',
          plan: selectedSubscription.name,
          daysAdded: selectedSubscription.durationDays
        };
        
        setInvoices([newInvoice, ...invoices]);
        
        onNotify(
          `✅ Factura ${newInvoice.numero} emitida en modo LOCAL (sin SRI)\n` +
          `📅 Plan: ${selectedSubscription.name}\n` +
          `⏰ Tiempo añadido: ${selectedSubscription.durationDays} días\n` +
          `📆 Nueva fecha de vencimiento: ${data.business?.subscriptionEnd ? new Date(data.business.subscriptionEnd).toLocaleDateString('es-EC') : 'N/A'}`,
          'success'
        );
        
        setSelectedBusiness(null);
        setSelectedSubscription(null);
      } else {
        const errorData = await response.json();
        onNotify(`Error: ${errorData.error || 'Error al emitir factura'}`, 'error');
      }
    } catch (error) {
      console.error('Error al emitir factura:', error);
      
      // SIMULACIÓN MODO DEMO
      const newInvoice: SaaSInvoice = {
        id: Date.now().toString(),
        numero: `001-001-${String(Math.floor(Math.random() * 999999)).padStart(7, '0')}`,
        fecha: new Date().toLocaleDateString('es-EC'),
        cliente: selectedBusiness.name,
        total: selectedSubscription.price,
        estado: 'LOCAL (DEMO)',
        plan: selectedSubscription.name,
        daysAdded: selectedSubscription.durationDays
      };
      
      setInvoices([newInvoice, ...invoices]);
      
      onNotify(
        `✅ [MODO DEMO - LOCAL] Factura ${newInvoice.numero} emitida!\n` +
        `📅 Plan: ${selectedSubscription.name}\n` +
        `⏰ Tiempo añadido: ${selectedSubscription.durationDays} días\n` +
        `📆 Nueva fecha: ${calculateNewEndDate(selectedBusiness.subscriptionEnd, selectedSubscription.durationDays)}`,
        'success'
      );
      
      setSelectedBusiness(null);
      setSelectedSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  // Función para emitir factura en modo SRI
  const handleEmitInvoiceSRI = async () => {
    if (!selectedBusiness || !selectedSubscription) {
      onNotify('Selecciona una empresa y un plan', 'warning');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch(`${API_URL}/api/admin/subscriptions/emit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          businessId: selectedBusiness.id,
          plan: selectedSubscription.code,
          durationDays: selectedSubscription.durationDays,
          amount: selectedSubscription.price,
          paymentMethod: 'SRI',
          mode: 'SRI'
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        const newInvoice: SaaSInvoice = {
          id: data.subscription?.id || Date.now().toString(),
          numero: data.invoice?.numero || `001-001-${Date.now()}`,
          fecha: data.invoice?.fecha || new Date().toLocaleDateString('es-EC'),
          cliente: selectedBusiness.name,
          total: selectedSubscription.price,
          estado: data.invoice?.estado || 'AUTORIZADA',
          plan: selectedSubscription.name,
          daysAdded: selectedSubscription.durationDays
        };
        
        setInvoices([newInvoice, ...invoices]);
        
        onNotify(
          `✅ Factura ${newInvoice.numero} emitida y autorizada por el SRI!\n` +
          `📅 Plan: ${selectedSubscription.name}\n` +
          `🔑 Clave de Acceso: ${data.invoice?.claveAcceso || 'N/A'}\n` +
          `⏰ Tiempo añadido: ${selectedSubscription.durationDays} días\n` +
          `📆 Nueva fecha de vencimiento: ${data.business?.subscriptionEnd ? new Date(data.business.subscriptionEnd).toLocaleDateString('es-EC') : 'N/A'}`,
          'success'
        );
        
        setSelectedBusiness(null);
        setSelectedSubscription(null);
      } else {
        const errorData = await response.json();
        onNotify(`Error: ${errorData.error || 'Error al emitir factura al SRI'}`, 'error');
      }
    } catch (error) {
      console.error('Error al emitir factura al SRI:', error);
      onNotify('Error al conectar con el SRI. Verifique la configuración de la empresa.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEmitInvoice = async () => {
    if (!selectedBusiness || !selectedSubscription) {
      onNotify('Selecciona una empresa y un plan', 'warning');
      return;
    }

    setLoading(true);
    try {
      // Obtener token
      const token = localStorage.getItem('adminToken');
      
      // Llamar al backend para emitir la factura
      const response = await fetch(`${API_URL}/api/admin/subscriptions/emit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          businessId: selectedBusiness.id,
          plan: selectedSubscription.code,
          durationDays: selectedSubscription.durationDays,
          amount: selectedSubscription.price,
          paymentMethod: 'DEMO'
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Agregar la nueva factura a la lista
        const newInvoice: SaaSInvoice = {
          id: data.subscription?.id || Date.now().toString(),
          numero: data.invoice?.numero || `001-001-${Date.now()}`,
          fecha: data.invoice?.fecha || new Date().toLocaleDateString('es-EC'),
          cliente: selectedBusiness.name,
          total: selectedSubscription.price,
          estado: 'AUTORIZADA',
          plan: selectedSubscription.name,
          daysAdded: selectedSubscription.durationDays
        };
        
        setInvoices([newInvoice, ...invoices]);
        
        onNotify(
          `✅ Factura ${newInvoice.numero} emitida exitosamente!\n` +
          `📅 Plan: ${selectedSubscription.name}\n` +
          `⏰ Tiempo añadido: ${selectedSubscription.durationDays} días\n` +
          `📆 Nueva fecha de vencimiento: ${data.business?.subscriptionEnd ? new Date(data.business.subscriptionEnd).toLocaleDateString('es-EC') : 'N/A'}`,
          'success'
        );
        
        setSelectedBusiness(null);
        setSelectedSubscription(null);
      } else {
        const errorData = await response.json();
        onNotify(`Error: ${errorData.error || 'Error al emitir factura'}`, 'error');
      }
    } catch (error) {
      console.error('Error al emitir factura:', error);
      
      // SIMULACIÓN MODO DEMO (si el backend no está disponible)
      const newInvoice: SaaSInvoice = {
        id: Date.now().toString(),
        numero: `001-001-${String(Math.floor(Math.random() * 999999)).padStart(7, '0')}`,
        fecha: new Date().toLocaleDateString('es-EC'),
        cliente: selectedBusiness.name,
        total: selectedSubscription.price,
        estado: 'AUTORIZADA (DEMO)',
        plan: selectedSubscription.name,
        daysAdded: selectedSubscription.durationDays
      };
      
      setInvoices([newInvoice, ...invoices]);
      
      onNotify(
        `✅ [MODO DEMO] Factura ${newInvoice.numero} emitida!\n` +
        `📅 Plan: ${selectedSubscription.name}\n` +
        `⏰ Tiempo añadido: ${selectedSubscription.durationDays} días\n` +
        `📆 Nueva fecha: ${calculateNewEndDate(selectedBusiness.subscriptionEnd, selectedSubscription.durationDays)}`,
        'success'
      );
      
      setSelectedBusiness(null);
      setSelectedSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-800 dark:text-white">Emisión de Facturas SaaS</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Emite facturas y renueva suscripciones del sistema</p>
            </div>
            <div className="flex items-center gap-3">
              {isDemoBusiness() && (
                <span className="px-4 py-2 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-sm font-bold rounded-full border border-purple-300 dark:border-purple-700">
                  <BeakerIcon className="w-4 h-4 inline" /> EMPRESA DE PRUEBAS
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Formulario de facturación */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6 md:p-8 mb-8">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Nueva Factura</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Selector de empresa */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                Empresa / Cliente
              </label>
              <select
                value={selectedBusiness?.id || ''}
                onChange={(e) => {
                  const business = businessList.find(b => b.id === e.target.value);
                  setSelectedBusiness(business || null);
                }}
                className="w-full p-4 bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl font-medium focus:border-indigo-500 focus:outline-none transition-colors text-slate-800 dark:text-white"
              >
                <option value="">Seleccionar empresa...</option>
                {businessList.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} {!b.isActive ? ' (Inactiva)' : ''} - {b.ruc}
                  </option>
                ))}
              </select>
            </div>

            {/* Selector de plan */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                Plan de Suscripción
              </label>
              <select
                value={selectedSubscription?.id || ''}
                onChange={(e) => {
                  const sub = activeSubscriptions.find(s => s.id === e.target.value);
                  setSelectedSubscription(sub || null);
                }}
                className="w-full p-4 bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl font-medium focus:border-indigo-500 focus:outline-none transition-colors text-slate-800 dark:text-white"
              >
                <option value="">Seleccionar plan...</option>
                {activeSubscriptions.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} - ${s.price}/{s.period}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Datos del cliente y tiempo de suscripción */}
          {selectedBusiness && (
            <div className="mt-6 p-6 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl border border-indigo-100 dark:border-indigo-800">
              <h3 className="font-bold text-indigo-800 dark:text-blue-300 mb-4">Datos del Cliente</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-indigo-600 dark:text-indigo-400 font-medium">Razón Social:</span>
                  <p className="font-bold text-slate-800 dark:text-white">{selectedBusiness.name}</p>
                </div>
                <div>
                  <span className="text-indigo-600 dark:text-indigo-400 font-medium">RUC:</span>
                  <p className="font-bold text-slate-800 dark:text-white">{selectedBusiness.ruc}</p>
                </div>
                <div>
                  <span className="text-indigo-600 dark:text-indigo-400 font-medium">Email:</span>
                  <p className="font-bold text-slate-800 dark:text-white">{selectedBusiness.email}</p>
                </div>
                <div>
                  <span className="text-indigo-600 dark:text-indigo-400 font-medium">Plan Actual:</span>
                  <p className="font-bold text-slate-800 dark:text-white">{selectedBusiness.plan}</p>
                </div>
              </div>
              
              {/* Tiempo de suscripción actual */}
              <div className="mt-4 pt-4 border-t border-indigo-200 dark:border-indigo-700">
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <CalendarDaysIcon className="w-4 h-4 inline text-indigo-600 dark:text-indigo-400" /> Fecha actual:
                    <span className="font-bold text-slate-800 dark:text-white">
                      {selectedBusiness.subscriptionEnd 
                        ? new Date(selectedBusiness.subscriptionEnd).toLocaleDateString('es-EC')
                        : 'Sin suscripción'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ClockIcon className="w-4 h-4 inline text-indigo-600 dark:text-indigo-400" /> Días restantes:
                    <span className={`font-bold ${calculateDaysRemaining(selectedBusiness.subscriptionEnd) > 10 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {calculateDaysRemaining(selectedBusiness.subscriptionEnd)} días
                    </span>
                  </div>
                </div>
              </div>

              {/* Configuración SRI de la empresa */}
              <div className="mt-4 pt-4 border-t border-indigo-200 dark:border-indigo-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BuildingOffice2Icon className="w-4 h-4 inline text-indigo-600 dark:text-indigo-400" /> Facturación SRI:
                    <span className={`px-2 py-1 text-xs font-bold rounded ${
                      (selectedBusiness as any).sriEnabled 
                        ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}>
                      {(selectedBusiness as any).sriEnabled ? 'HABILITADA' : 'NO CONFIGURADA'}
                    </span>
                  </div>
                  {(selectedBusiness as any).sriEnabled && (
                    <span className="text-xs text-green-600 dark:text-green-400">
                      <CheckCircleIcon className="w-4 h-4 inline text-green-600 dark:text-green-400" /> Firma electrónica configurada
                    </span>
                  )}
                </div>
                {!(selectedBusiness as any).sriEnabled && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    <ExclamationTriangleIcon className="w-4 h-4 inline" /> Para emitir facturas al SRI, configure la firma electrónica en la gestión de empresas.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Resumen de factura con tiempo a añadir */}
          {selectedSubscription && selectedBusiness && (
            <div className="mt-6 p-6 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl border border-emerald-100 dark:border-emerald-800">
              <h3 className="font-bold text-emerald-800 dark:text-emerald-300 mb-4">Resumen de Factura</h3>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-slate-600 dark:text-slate-300">
                    Plan: <span className="font-bold text-slate-800 dark:text-white">{selectedSubscription.name}</span>
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">
                    Período: <span className="font-bold text-slate-800 dark:text-white">{selectedSubscription.period}</span>
                  </p>
                  <div className="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-700">
                    <p className="text-emerald-700 dark:text-emerald-300 font-medium">
                      <CheckCircleIcon className="w-4 h-4 inline text-emerald-600" /> Se añadirán: <span className="font-bold text-emerald-800 dark:text-emerald-200">{selectedSubscription.durationDays} días</span>
                    </p>
                    <p className="text-slate-600 dark:text-slate-300 text-sm mt-1">
                      <CalendarDaysIcon className="w-4 h-4 inline text-slate-600 dark:text-slate-300" /> Nueva fecha: <span className="font-bold text-slate-800 dark:text-white">
                        {calculateNewEndDate(selectedBusiness.subscriptionEnd, selectedSubscription.durationDays)}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">${selectedSubscription.price.toFixed(2)}</p>
                  <p className="text-sm text-emerald-500 dark:text-emerald-400">IVA incluido</p>
                </div>
              </div>
              
              {/* Banner modo demo - solo para empresa de pruebas */}
              {isDemoBusiness() && (
                <div className="mt-4 p-3 bg-purple-100 dark:bg-purple-900/50 rounded-lg border border-purple-300 dark:border-purple-700">
                  <p className="text-purple-800 dark:text-purple-200 text-sm font-medium text-center">
                    <BeakerIcon className="w-4 h-4 inline" /> Empresa de pruebas
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex flex-col gap-4 mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
            {/* Selector de modo de emisión */}
            <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
              <span className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                Modo de emisión:
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEmissionMode('LOCAL')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    emissionMode === 'LOCAL'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-500'
                  }`}
                >
                  <HomeIcon className="w-4 h-4 inline" /> Local (Sin SRI)
                </button>
                <button
                  type="button"
                  onClick={() => setEmissionMode('SRI')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    emissionMode === 'SRI'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-500'
                  }`}
                >
                  <BuildingOffice2Icon className="w-4 h-4 inline" /> SRI (Autorizado)
                </button>
              </div>
            </div>

            {/* Información del modo seleccionado */}
            {emissionMode === 'SRI' && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg border border-amber-200 dark:border-amber-700">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  <ExclamationTriangleIcon className="w-4 h-4 inline" /> <strong>Modo SRI:</strong> La factura será enviada al SRI para autorización. 
                  Requires que la empresa tenga configurada la firma electrónica y clave SRI.
                </p>
              </div>
            )}
            {emissionMode === 'LOCAL' && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg border border-emerald-200 dark:border-emerald-700">
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  <CheckCircleIcon className="w-4 h-4 inline" /> <strong>Modo Local:</strong> La factura se emite localmente sin enviar al SRI. 
                  Ideal para pruebas o facturación offline.
                </p>
              </div>
            )}

            {/* Botones de emitir */}
            <div className="flex gap-4 mt-2">
              <button
                className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                onClick={() => {
                  setSelectedBusiness(null);
                  setSelectedSubscription(null);
                }}
              >
                Cancelar
              </button>
              
              {emissionMode === 'LOCAL' ? (
                <button
                  onClick={handleEmitInvoiceLocal}
                  disabled={loading || !selectedBusiness || !selectedSubscription}
                  className={`flex-[2] py-4 font-bold rounded-xl shadow-lg transition-all ${
                    loading || !selectedBusiness || !selectedSubscription
                      ? 'bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-xl'
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <ClockIcon className="w-5 h-5 animate-spin" /> Emitiendo...
                    </span>
                  ) : (
                    <><HomeIcon className="w-4 h-4 inline" /> Emitir Factura (Local)</>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleEmitInvoiceSRI}
                  disabled={loading || !selectedBusiness || !selectedSubscription}
                  className={`flex-[2] py-4 font-bold rounded-xl shadow-lg transition-all ${
                    loading || !selectedBusiness || !selectedSubscription
                      ? 'bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-xl'
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <ClockIcon className="w-5 h-5 animate-spin" /> Enviando al SRI...
                    </span>
                  ) : (
                    <><BuildingOffice2Icon className="w-4 h-4 inline" /> Emitir y Enviar al SRI</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
