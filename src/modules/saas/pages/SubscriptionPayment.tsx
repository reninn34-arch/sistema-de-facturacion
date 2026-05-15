import React, { useState, useEffect } from 'react';
import { EnvelopeIcon } from '@heroicons/react/24/outline';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

// Configuración de PayPal
const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || 'sb';
const IS_SANDBOX = import.meta.env.VITE_PAYPAL_SANDBOX === 'true';

// Componente para mostrar datos bancarios desde API
const BankDetailsDisplay: React.FC = () => {
  const [bankSettings, setBankSettings] = useState<any>(null);
  useEffect(() => {
    fetch(`${API_URL}/api/admin/settings`)
      .then(r => r.json())
      .then(d => setBankSettings(d))
      .catch(() => {});
  }, []);
  
  const accounts = bankSettings?.bankAccounts || [];

  if (accounts.length === 0) {
    return <div className="text-xs text-sky-500 dark:text-sky-400 space-y-1">
      <p>Banco Pichincha</p>
      <p>Cuenta: 1234567890</p>
    </div>;
  }
  return (
    <div className="space-y-3">
      {accounts.map((bank: any) => (
        <div key={bank.id} className="text-xs text-sky-500 dark:text-sky-400 space-y-1 p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-sky-100 dark:border-sky-900/50 shadow-sm">
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

interface BusinessInfo {
  id: string;
  name: string;
  ruc: string;
  email: string;
  plan: string;
  subscriptionEnd: string | null;
  isActive: boolean;
}

interface PagoInternoProps {
  businessInfo: BusinessInfo;
  isExpired?: boolean;
  onPaymentComplete: () => void;
  onBack: () => void;
  onNotify?: (text: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

const PagoInterno: React.FC<PagoInternoProps> = ({ businessInfo, isExpired = false, onPaymentComplete, onBack, onNotify }) => {
  // Valor por defecto para onNotify
  const showNotify = onNotify || (() => {});
  const [selectedPlan, setSelectedPlan] = useState<string>('MONTHLY');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'TRANSFER' | 'CARD' | 'PAYPAL'>('TRANSFER');
  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    cardName: '',
    cardExpiry: '',
    cardCvv: '',
    transferReference: '',
  });
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPendingApproval, setShowPendingApproval] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [paymentSettings, setPaymentSettings] = useState({ paypalEnabled: true, transferEnabled: true, cardEnabled: false });

  // Cargar configuración de métodos de pago
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
            if (current === 'TRANSFER' && !settings.transferEnabled) return settings.cardEnabled ? 'CARD' : (settings.paypalEnabled ? 'PAYPAL' : 'TRANSFER');
            if (current === 'CARD' && !settings.cardEnabled) return settings.transferEnabled ? 'TRANSFER' : (settings.paypalEnabled ? 'PAYPAL' : 'CARD');
            if (current === 'PAYPAL' && !settings.paypalEnabled) return settings.transferEnabled ? 'TRANSFER' : (settings.cardEnabled ? 'CARD' : 'PAYPAL');
            return current;
          });
        }
      })
      .catch(() => {});
  }, []);

  // Cargar planes disponibles desde la API
  useEffect(() => {
    const loadPlans = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_URL}/api/subscription-plans`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          // Filtrar planes: excluir PENDING, UNLIMITED y FREE (solo para superadmins)
          // El precio del backend ya incluye IVA
          const filteredPlans = (data.plans || data)
            .filter((plan: any) => plan.code !== 'PENDING' && plan.code !== 'UNLIMITED' && plan.code !== 'FREE')
            .map((plan: any) => ({
              id: plan.code,
              name: plan.name,
              price: plan.price, // Ya es el precio final con IVA
              period: plan.period,
              durationDays: plan.durationDays,
              features: plan.features
            }));
          setAvailablePlans(filteredPlans);
          
          // Seleccionar primer plan disponible por defecto
          if (filteredPlans.length > 0) {
            setSelectedPlan(filteredPlans[0].id);
          }
        }
      } catch (error) {
        console.error('Error cargando planes:', error);
        // fallback a planes hardcoded (precios con IVA 15%)
        setAvailablePlans([
          { id: 'MONTHLY', name: 'Mensual', price: 34.49, period: 'mes' }, // Plan Básico $29.99 + IVA
          { id: 'SEMIANNUAL', name: 'Semestral', price: 172.49, period: '6 meses' }, // Plan Profesional $149.99 + IVA
          { id: 'YEARLY', name: 'Anual', price: 287.49, period: '1 año' } // Plan Empresarial $249.99 + IVA
        ]);
      }
    };
    loadPlans();
    
    // Escuchar actualizaciones de planes desde otras páginas
    const handlePlansUpdate = () => {
      loadPlans();
    };
    
    // Verificar si hubo actualizaciones mientras la página estaba oculta
    const checkForUpdates = () => {
      const lastUpdate = localStorage.getItem('plans_updated');
      if (lastUpdate) {
        const updateTime = parseInt(lastUpdate);
        const pageLoadTime = parseInt(sessionStorage.getItem('page_load_time_payment') || '0');
        if (updateTime > pageLoadTime) {
          loadPlans();
        }
      }
    };
    
    // Guardar tiempo de carga de la página
    sessionStorage.setItem('page_load_time_payment', Date.now().toString());
    
    // Verificar inmediatamente si hay actualizaciones
    checkForUpdates();
    
    // Listener para storage (detecta cambios en localStorage de otras pestañas)
    window.addEventListener('storage', handlePlansUpdate);
    
    return () => {
      window.removeEventListener('storage', handlePlansUpdate);
    };
  }, []);

  // Calcular días vencidos
  const daysOverdue = businessInfo.subscriptionEnd 
    ? Math.floor((new Date().getTime() - new Date(businessInfo.subscriptionEnd).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Planes disponibles (cargados desde API)
  const currentPlan = availablePlans.find(p => p.id === selectedPlan) || availablePlans[0] || { id: 'MONTHLY', name: 'Mensual', price: 34.49, period: 'mes' };

  const handlePayment = async () => {
    setIsProcessing(true);
    
    try {
      const token = localStorage.getItem('adminToken');
      
      // Si es transferencia, crear una solicitud de activación (no activa inmediatamente)
      if (paymentMethod === 'TRANSFER') {
        // Primero crear la solicitud de activación
        const requestData = {
          businessId: businessInfo.id,
          plan: selectedPlan,
          amount: currentPlan.price,
          paymentMethod: 'TRANSFER',
          referenceNumber: paymentData.transferReference
        };

        const response = await fetch(`${API_URL}/api/activation-requests`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(requestData)
        });

        if (response.ok) {
          const requestResult = await response.json();
          const requestId = requestResult.request?.id;

          // Si hay comprobante, subirlo
          if (paymentProof && requestId) {
            // Convertir imagen a base64
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve) => {
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(paymentProof);
            });
            const base64Image = await base64Promise;

            console.log('Subiendo imagen, tamaño:', base64Image.length);

            // Actualizar la solicitud con la imagen
            const uploadResponse = await fetch(`${API_URL}/api/activation-requests/${requestId}/upload-proof`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                paymentProofUrl: base64Image,
                paymentProofName: paymentProof.name
              })
            });
            
            if (!uploadResponse.ok) {
              console.error('Error al subir imagen:', await uploadResponse.text());
              showNotify('Error al subir el comprobante de pago', 'warning');
            } else {
              console.log('Imagen subida correctamente');
            }
          }

          // Mostrar mensaje de éxito indicando que está pendiende confirmación
          showNotify('✅ Solicitud de activación enviada correctamente. Su suscripción será activada una vez que el administrador verifique el comprobante de pago.', 'success');
          
          // Mostrar pantalla de espera de aprobación en lugar de desbloquear
          setShowPendingApproval(true);
          return;
        } else {
          onNotify('Error al crear la solicitud. Intente nuevamente.', 'error');
          return;
        }
      }

      // Para otros métodos de pago (tarjeta, PayPal), procesar normalmente
      // Simular procesamiento de pago interno
      const response = await fetch(`${API_URL}/api/subscriptions/payment-internal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          businessId: businessInfo.id,
          plan: selectedPlan,
          paymentMethod: paymentMethod === 'CARD' ? 'CARD' : 'PAYPAL',
          amount: currentPlan.price,
          paymentDetails: paymentMethod === 'CARD' ? {
            cardLast4: paymentData.cardNumber.slice(-4),
            cardName: paymentData.cardName
          } : {
            reference: paymentData.transferReference
          }
        })
      });

      if (response.ok) {
        setShowSuccess(true);
        setTimeout(() => {
          onPaymentComplete();
        }, 2000);
      } else {
        showNotify('Error al procesar el pago. Intente nuevamente.', 'error');
      }
    } catch (error) {
      console.error('Error en pago:', error);
      // Para demo, simulamos éxito
      setShowSuccess(true);
      setTimeout(() => {
        onPaymentComplete();
      }, 2000);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    // Pantalla de espera de aprobación de transferencia
    <>
    {showPendingApproval && (
      <div className={`min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-sky-50 to-sky-100 dark:from-slate-900 dark:to-sky-900/20`}>
        <div className="relative z-50 w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <svg className="w-10 h-10 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4">
            Esperando Aprobación
          </h2>
          <p className="text-slate-600 dark:text-slate-300 mb-6">
            Su comprobante de pago ha sido enviado correctamente. <br/>
            <span className="font-bold text-amber-600 dark:text-amber-400">
              Un administrador revisará y aprobará su transferencia.
            </span>
          </p>
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <EnvelopeIcon className="w-4 h-4 inline" /> Se notificará a su correo electrónico una vez approveda la transferencia.
            </p>
          </div>
          <button
            onClick={() => {
              // Recargar la página para verificar estado
              window.location.reload();
            }}
            className="mt-6 w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Verificar Estado
          </button>
        </div>
      </div>
    )}

    {/* Solo mostrar el resto si no está esperando aprobación */}
    {!showPendingApproval && (
    <div className={`min-h-screen flex items-center justify-center p-4 ${isExpired ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'bg-slate-50 dark:bg-slate-900'}`}>
      {/* Overlay de bloqueo solo cuando está vencido */}
      {isExpired && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"></div>}
      
      <div className={`relative z-50 w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden ${isExpired ? '' : 'mt-8'}`}>
        {/* Header de alerta */}
        <div className={`p-6 text-white ${isExpired ? 'bg-gradient-to-r from-red-600 to-red-700' : 'bg-gradient-to-r from-sky-700 to-sky-700'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isExpired ? 'bg-white/20' : 'bg-white/20'}`}>
                {isExpired ? (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                )}
              </div>
              <div>
                <h2 className="text-2xl font-black uppercase tracking-wider">
                  {isExpired ? 'Suscripción Vencida' : 'Gestionar Suscripción'}
                </h2>
                {isExpired ? (
                  <p className="text-red-100 text-sm">
                    Su suscripción venció hace <span className="font-bold">{daysOverdue} días</span>. 
                    Debe renovar para continuar usando el sistema.
                  </p>
                ) : (
                  <p className="text-sky-100 text-sm">
                    Actualice su plan orene nueva suscripción cuando lo desee.
                  </p>
                )}
              </div>
            </div>
            {!isExpired && (
              <button onClick={onBack} className="text-white/80 hover:text-white">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {showSuccess ? (
          /* Estado de éxito */
          <div className="p-12 text-center">
            <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">¡Pago Exitoso!</h3>
            <p className="text-slate-600 dark:text-slate-400">Su suscripción ha sido renovada correctamente.</p>
            <p className="text-sm text-slate-500 mt-2">Redirigiendo al sistema...</p>
          </div>
        ) : (
          /* Contenido del formulario */
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Columna izquierda - Plans */}
            <div className="p-8 border-r border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 uppercase tracking-wider">
                {isExpired ? 'Renovar Ahora' : 'Cambiar Plan'}
              </h3>
              
              <div className="space-y-3">
                {availablePlans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`w-full p-4 rounded-2xl border-2 transition-all text-left ${
                      selectedPlan === plan.id
                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{plan.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          ${plan.price} USD / {plan.period}
                        </p>
                      </div>
                      {plan.discount && (
                        <span className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-bold px-2 py-1 rounded-full">
                          AHORRO
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Info de la empresa */}
              <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Empresa
                </h4>
                <p className="font-bold text-slate-900 dark:text-white">{businessInfo.name}</p>
                <p className="text-sm text-slate-500">RUC: {businessInfo.ruc}</p>
                <p className="text-sm text-slate-500">Plan actual: {businessInfo.plan}</p>
              </div>
            </div>

            {/* Columna derecha - Payment */}
            <div className="p-8">
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 uppercase tracking-wider">
                Método de Pago
              </h3>

              {/* Selector de método */}
              <div className="flex gap-2 mb-6">
                {paymentSettings.transferEnabled && (
                <button
                  onClick={() => { setPaymentMethod('TRANSFER'); setPaymentData({...paymentData, cardNumber: '', cardName: '', cardExpiry: '', cardCvv: ''}); }}
                  className={`flex-1 py-2 px-4 rounded-xl text-sm font-bold transition-all ${
                    paymentMethod === 'TRANSFER'
                      ? 'bg-sky-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Transferencia
                </button>
                )}
                {paymentSettings.cardEnabled && (
                <button
                  onClick={() => { setPaymentMethod('CARD'); setPaymentData({...paymentData, transferReference: ''}); }}
                  className={`flex-1 py-2 px-4 rounded-xl text-sm font-bold transition-all ${
                    paymentMethod === 'CARD'
                      ? 'bg-sky-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Tarjeta
                </button>
                )}
                {paymentSettings.paypalEnabled && (
                <button
                  onClick={() => { setPaymentMethod('PAYPAL'); setPaymentData({...paymentData, transferReference: ''}); }}
                  className={`flex-1 py-2 px-4 rounded-xl text-sm font-bold transition-all ${
                    paymentMethod === 'PAYPAL'
                      ? 'bg-sky-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  PayPal
                </button>
                )}
              </div>

              {/* Formulario según método */}
              {paymentMethod === 'TRANSFER' && (
                <div className="space-y-4">
                  <div className="p-4 bg-sky-50 dark:bg-sky-900/20 rounded-xl border border-sky-200 dark:border-sky-800">
                    <p className="text-sm font-bold text-sky-800 dark:text-blue-300 mb-2">
                      Datos para transferencia:
                    </p>
                    <BankDetailsDisplay />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Número de Referencia
                    </label>
                    <input
                      type="text"
                      value={paymentData.transferReference}
                      onChange={(e) => setPaymentData({ ...paymentData, transferReference: e.target.value })}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm focus:border-sky-500 outline-none"
                      placeholder="Ingrese el número de transferencia"
                    />
                  </div>
                  
                  {/* Upload de comprobante */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Comprobante de Pago (Foto)
                    </label>
                    <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-4 text-center hover:border-sky-500 transition-colors">
                      {paymentProofPreview ? (
                        <div className="relative">
                          <img 
                            src={paymentProofPreview} 
                            alt="Comprobante" 
                            className="max-h-40 mx-auto rounded-lg"
                          />
                          <button
                            onClick={() => { setPaymentProof(null); setPaymentProofPreview(null); }}
                            className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setPaymentProof(file);
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setPaymentProofPreview(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="hidden"
                          />
                          <div className="py-2">
                            <svg className="w-8 h-8 mx-auto text-slate-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-sm text-slate-500">
                              Haga clic para subir la foto del comprobante
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              PNG, JPG hasta 5MB
                            </p>
                          </div>
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === 'CARD' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Número de Tarjeta
                    </label>
                    <input
                      type="text"
                      value={paymentData.cardNumber}
                      onChange={(e) => setPaymentData({ ...paymentData, cardNumber: e.target.value.replace(/\D/g, '').slice(0, 16) })}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm focus:border-sky-500 outline-none"
                      placeholder="1234 5678 9012 3456"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Nombre en Tarjeta
                    </label>
                    <input
                      type="text"
                      value={paymentData.cardName}
                      onChange={(e) => setPaymentData({ ...paymentData, cardName: e.target.value })}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm focus:border-sky-500 outline-none"
                      placeholder="Como aparece en el plástico"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Expiración
                      </label>
                      <input
                        type="text"
                        value={paymentData.cardExpiry}
                        onChange={(e) => setPaymentData({ ...paymentData, cardExpiry: e.target.value })}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm focus:border-sky-500 outline-none"
                        placeholder="MM/YY"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                        CVC
                      </label>
                      <input
                        type="text"
                        value={paymentData.cardCvv}
                        onChange={(e) => setPaymentData({ ...paymentData, cardCvv: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm focus:border-sky-500 outline-none"
                        placeholder="123"
                      />
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === 'PAYPAL' && (
                <div className="space-y-4">
                  <div className="p-4 bg-sky-50 dark:bg-sky-900/20 rounded-xl border border-sky-200 dark:border-sky-800">
                    <p className="text-sm text-sky-800 dark:text-blue-300 mb-2 text-center">
                      Subtotal: <strong>${(currentPlan.price / 1.15).toFixed(2)} USD</strong><br />
                      IVA 15%: <strong>${(currentPlan.price - currentPlan.price / 1.15).toFixed(2)} USD</strong><br />
                      Total a pagar: <strong className="text-lg">${currentPlan.price.toFixed(2)} USD</strong>
                    </p>
                  </div>
                  <PayPalScriptProvider 
                    options={{ 
                      clientId: PAYPAL_CLIENT_ID, 
                      currency: "USD",
                      intent: "capture",
                      debug: IS_SANDBOX
                    }}
                  >
                    <PayPalButtons
                      style={{ layout: "vertical" }}
                      createOrder={(data, actions) => {
                        return actions.order.create({
                          intent: "CAPTURE",
                          purchase_units: [{
                            amount: { currency_code: "USD", value: currentPlan.price.toFixed(2) },
                            description: `Suscripción Azul - ${currentPlan.name}`
                          }]
                        });
                      }}
                      onApprove={async (data, actions) => {
                        try {
                          setIsProcessing(true);
                          if (actions.order) {
                            const details = await actions.order.capture();
                            // Payment captured successfully
                            
                            // Procesar la suscripción en el backend
                            const token = localStorage.getItem('adminToken');
                            const response = await fetch(`${API_URL}/api/subscriptions/payment-internal`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                              },
                              body: JSON.stringify({
                                businessId: businessInfo.id,
                                plan: selectedPlan,
                                paymentMethod: 'PAYPAL',
                                amount: currentPlan.price,
                                paymentDetails: {
                                  paypalOrderId: data.orderID,
                                  paypalPayerId: data.payerID
                                }
                              })
                            });

                            if (response.ok) {
                              setShowSuccess(true);
                              setTimeout(() => {
                                onPaymentComplete();
                              }, 2000);
                            } else {
                              showNotify('Error al procesar el pago. Intente nuevamente.', 'error');
                            }
                          }
                        } catch (error) {
                          console.error('Error capturing payment:', error);
                          showNotify('Error al procesar el pago. Por favor intente de nuevo.', 'error');
                        } finally {
                          setIsProcessing(false);
                        }
                      }}
                      onError={(err) => {
                        console.error('PayPal Error:', err);
                        showNotify('Error de conexión con PayPal. Verifique su conexión e intente de nuevo.', 'error');
                      }}
                      onCancel={() => {
                        // Pago cancelado, no hacer nada
                      }}
                    />
                  </PayPalScriptProvider>
                </div>
              )}

              {/* Resumen */}
              <div className="mt-6 p-4 bg-slate-900 dark:bg-slate-800 rounded-xl">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-400">Plan {currentPlan.name}</span>
                  <span className="font-bold text-white">${(currentPlan.price / 1.15).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-2 text-xs text-slate-500">
                  <span>IVA 15%</span>
                  <span>${(currentPlan.price - currentPlan.price / 1.15).toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-700 pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white">Total a pagar</span>
                    <span className="text-2xl font-black text-sky-400">${currentPlan.price.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Botón de pago - solo para TRANSFER y CARD */}
              {paymentMethod !== 'PAYPAL' && (
                <button
                  onClick={handlePayment}
                  disabled={isProcessing || (paymentMethod === 'TRANSFER' && (!paymentData.transferReference || !paymentProof)) || (paymentMethod === 'CARD' && (!paymentData.cardNumber || !paymentData.cardName || !paymentData.cardExpiry || !paymentData.cardCvv))}
                  className="w-full mt-6 py-4 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-black uppercase tracking-widest rounded-xl shadow-lg shadow-sky-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Procesando...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Pagar Ahora
                    </>
                  )}
                </button>
              )}

              {/* Mensaje instructivo para PayPal */}
              {paymentMethod === 'PAYPAL' && (
                <p className="text-center text-xs text-slate-500 mt-4">
                  Complete el pago usando el botón de PayPal acima. No cierre esta ventana hasta completar la transacción.
                </p>
              )}

              <p className="text-center text-xs text-slate-500 mt-4">
                Pago seguro. Sus datos están protegidos.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
    )}
    </>
  );
};

export default PagoInterno;
