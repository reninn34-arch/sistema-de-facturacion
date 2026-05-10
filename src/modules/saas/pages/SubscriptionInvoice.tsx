import React, { useState, useMemo } from 'react';
import {
  BuildingOffice2Icon,
  DocumentTextIcon,
  RocketLaunchIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  HandRaisedIcon,
} from '@heroicons/react/24/outline';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

interface Business {
  id: string | number;
  name: string;
  isActive: boolean;
  subscriptionEnd: string | Date | null;
  plan?: string;
}

interface UserWithBusiness {
  id: string | number;
  email: string;
  role: string;
  businessId: string | number | null;
  business: Business | null;
}

interface SubscriptionInvoiceProps {
  onNotify: (text: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

// Plan prices for subscription invoices
const PLAN_PRICES: Record<string, number> = {
  MONTHLY: 29.00,
  SEMIANNUAL: 79.00,
  YEARLY: 299.00,
  RENEWAL: 29.00,
};

const SubscriptionInvoice: React.FC<SubscriptionInvoiceProps> = ({ onNotify }) => {
  const [users, setUsers] = useState<UserWithBusiness[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | number | null>(null);
  const [loading, setLoading] = useState(false);
  const [invoiceType, setInvoiceType] = useState<string>('MONTHLY');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  // Load users to get business list
  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) return;

      const response = await fetch(`${API_URL}/api/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Error al cargar lista de empresas');
      
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error(error);
      onNotify('Error al cargar datos de empresas', 'error');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadData();
  }, []);

  // Extract unique businesses
  const businesses = useMemo(() => {
    return users
      .map(u => u.business)
      .filter((b): b is Business => !!b)
      .filter((b, index, self) => index === self.findIndex(t => t.id === b.id));
  }, [users]);

  const selectedBusiness = useMemo(() => {
    return businesses.find(b => String(b.id) === String(selectedBusinessId));
  }, [businesses, selectedBusinessId]);

  const amount = customAmount ? parseFloat(customAmount) : PLAN_PRICES[invoiceType] || 0;

  const handleGenerateInvoice = async () => {
    if (!selectedBusiness) {
      onNotify('Selecciona una empresa primero', 'warning');
      return;
    }

    if (amount <= 0) {
      onNotify('Ingresa un monto válido', 'error');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      
      // Create invoice data
      const invoiceData = {
        businessId: selectedBusiness.id,
        businessName: selectedBusiness.name,
        type: invoiceType,
        amount: amount,
        description: description || getInvoiceDescription(),
      };

      // Call API to generate invoice
      const response = await fetch(`${API_URL}/api/invoices/subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(invoiceData)
      });

      const data = await response.json();
      
      if (response.ok) {
        onNotify(`✅ Factura de ${amount.toFixed(2)} USD generada correctamente para ${selectedBusiness.name}`, 'success');
        // Reset form
        setDescription('');
        setCustomAmount('');
      } else {
        onNotify(data.message || 'Error al generar factura', 'error');
      }
    } catch (error) {
      console.error(error);
      onNotify('Error de conexión', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getInvoiceDescription = () => {
    switch (invoiceType) {
      case 'MONTHLY': return 'Suscripción Mensual - Plan Básico';
      case 'SEMIANNUAL': return 'Suscripción Semestral';
      case 'YEARLY': return 'Suscripción Anual';
      case 'RENEWAL': return 'Renovación de Suscripción';
      default: return 'Servicio de Suscripción';
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-3 lg:gap-4 h-[calc(100vh-180px)] animate-in fade-in duration-500">
      {/* Sidebar: Lista de Empresas */}
      <div className="w-full lg:w-1/4 bg-white rounded-2xl lg:rounded-3xl shadow-xl border border-slate-100 overflow-hidden flex flex-col">
        <div className="p-4 lg:p-6 border-b border-slate-100 bg-slate-50">
          <h3 className="font-black text-slate-700 text-base lg:text-lg">          <BuildingOffice2Icon className="w-4 h-4 inline" /> Empresas</h3>
          <p className="text-xs text-slate-400 mt-1">{businesses.length} empresas registradas</p>
        </div>
        <div className="overflow-y-auto flex-1 p-3 space-y-2 custom-scrollbar max-h-[30vh] lg:max-h-none">
          {loading && businesses.length === 0 ? (
            <div className="text-center p-4 text-slate-400">Cargando...</div>
          ) : (
            businesses.map(b => (
              <div
                key={b.id}
                onClick={() => setSelectedBusinessId(b.id)}
                className={`p-3 lg:p-4 rounded-xl cursor-pointer transition-all border-2 ${
                  String(selectedBusinessId) === String(b.id)
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-transparent hover:bg-slate-50'
                }`}
              >
                <div className="font-bold text-slate-800 text-sm lg:text-base">{b.name}</div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-slate-400">{b.plan || 'Básico'}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    b.isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {b.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {selectedBusiness ? (
          <div className="bg-white rounded-xl lg:rounded-2xl shadow-xl border border-slate-100 p-4 lg:p-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center">
                <DocumentTextIcon className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-2xl lg:text-3xl font-black text-slate-800">Factura de Suscripción</h2>
                <p className="text-slate-400 font-medium">Empresa: {selectedBusiness.name}</p>
              </div>
            </div>

            {/* Invoice Form */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">
                    Tipo de Servicio
                  </label>
                  <select
                    value={invoiceType}
                    onChange={(e) => {
                      setInvoiceType(e.target.value);
                      setCustomAmount('');
                    }}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="MONTHLY">Suscripción Mensual - $29.00</option>
                    <option value="SEMIANNUAL">Suscripción Semestral - $79.00</option>
                    <option value="YEARLY">Suscripción Anual - $299.00</option>
                    <option value="RENEWAL">Renovación de Suscripción - $29.00</option>
                    <option value="CUSTOM">Monto Personalizado</option>
                  </select>
                </div>

                {invoiceType === 'CUSTOM' && (
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">
                      Monto Personalizado (USD)
                    </label>
                    <input
                      type="number"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-black text-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="0.01"
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={getInvoiceDescription()}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                  />
                </div>
              </div>

              {/* Right Column - Summary */}
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-50 rounded-2xl p-6 border border-indigo-100">
                  <h3 className="font-black text-slate-800 mb-4">                  <DocumentTextIcon className="w-4 h-4 inline" /> Resumen de Factura</h3>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Empresa:</span>
                      <span className="font-bold text-slate-800">{selectedBusiness.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Tipo:</span>
                      <span className="font-bold text-slate-800">
                        {invoiceType === 'CUSTOM' ? 'Personalizado' : invoiceType}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Plan:</span>
                      <span className="font-bold text-indigo-600">{selectedBusiness.plan || 'Básico'}</span>
                    </div>
                    <div className="border-t border-slate-200 pt-3 mt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 font-bold">Total:</span>
                        <span className="text-3xl font-black text-indigo-600">${amount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleGenerateInvoice}
                  disabled={loading || amount <= 0}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-900/30"
                >
                  {loading ? <><ClockIcon className="w-4 h-4 inline animate-spin" /> Generando...</> : <><RocketLaunchIcon className="w-4 h-4 inline" /> Generar Factura SRI</>}
                </button>

                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                  <p className="text-xs text-amber-700 font-medium">
                    <ExclamationTriangleIcon className="w-4 h-4 inline" /> Esta acción generará una factura electrónica autorizada por el SRI.
                    Asegúrate de tener los certificados digitales configurados.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center p-10">
              <HandRaisedIcon className="w-16 h-16 mb-4 mx-auto opacity-30" />
              <h3 className="text-xl font-bold text-slate-600 mb-2">Selecciona una empresa</h3>
              <p className="text-slate-400">Haz clic en una empresa de la lista para crear una factura</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionInvoice;
