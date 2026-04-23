import React, { useState, useEffect } from 'react';

// Interfaces para los planes de suscripción
interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description: string;
  price: number;
  period: 'mensual' | 'trimestral' | 'semestral' | 'anual';
  durationDays: number;
  features: string[];
  maxBusinesses: number;
  maxInvoicesPerMonth: number;
  hasAIAssistant: boolean;
  hasPrioritySupport: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface SubscriptionPlansManagerProps {
  onNotify: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

// Datos por defecto
const defaultPlans: SubscriptionPlan[] = [
  {
    id: '1',
    code: 'FREE',
    name: 'Plan Free',
    description: 'Plan gratuito para pruebas y usuarios nuevos',
    price: 0,
    period: 'mensual',
    durationDays: 30,
    features: ['1 empresa', '10 facturas/mes', 'Soporte por email'],
    maxBusinesses: 1,
    maxInvoicesPerMonth: 10,
    hasAIAssistant: false,
    hasPrioritySupport: false,
    isActive: true
  },
  {
    id: '2',
    code: 'PRO',
    name: 'Plan Pro',
    description: 'Plan profesional para negocios en crecimiento',
    price: 29.99,
    period: 'mensual',
    durationDays: 30,
    features: ['5 empresas', 'Facturas ilimitadas', 'Asistente IA', 'Soporte prioritario'],
    maxBusinesses: 5,
    maxInvoicesPerMonth: -1,
    hasAIAssistant: true,
    hasPrioritySupport: true,
    isActive: true
  },
  {
    id: '3',
    code: 'ENTERPRISE',
    name: 'Plan Enterprise',
    description: 'Plan empresarial para grandes organizaciones',
    price: 99.99,
    period: 'mensual',
    durationDays: 30,
    features: ['Empresas ilimitadas', 'Facturas ilimitadas', 'Asistente IA', 'Soporte 24/7', 'API Access'],
    maxBusinesses: -1,
    maxInvoicesPerMonth: -1,
    hasAIAssistant: true,
    hasPrioritySupport: true,
    isActive: true
  }
];

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const SubscriptionPlansManager: React.FC<SubscriptionPlansManagerProps> = ({ onNotify }) => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>(defaultPlans);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [formData, setFormData] = useState<Partial<SubscriptionPlan>>({
    period: 'mensual',
    durationDays: 30,
    maxBusinesses: 1,
    maxInvoicesPerMonth: 10,
    hasAIAssistant: false,
    hasPrioritySupport: false,
    isActive: true,
    price: 0
  });
  const [featuresText, setFeaturesText] = useState('');
  const [confirmModal, setConfirmModal] = useState<{show: boolean, planId: string | null, planName: string}>({show: false, planId: null, planName: ''});

  // Cargar planes desde el backend
  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/subscription-plans`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.plans && data.plans.length > 0) {
          setPlans(data.plans);
          // No guardamos en localStorage - siempre cargamos del backend
        }
      }
    } catch (error) {
      console.error('Error cargando planes:', error);
      // En caso de error, usar planes por defecto
      setPlans(defaultPlans);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (plan?: SubscriptionPlan) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData(plan);
      setFeaturesText(plan.features.join('\n'));
    } else {
      setEditingPlan(null);
      setFormData({
        code: '',
        name: '',
        description: '',
        price: 0,
        period: 'mensual',
        durationDays: 30,
        features: [],
        maxBusinesses: 1,
        maxInvoicesPerMonth: 10,
        hasAIAssistant: false,
        hasPrioritySupport: false,
        isActive: true
      });
      setFeaturesText('');
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    console.log('Guardando plan - Period:', formData.period);
    if (!formData.name || !formData.code) {
      onNotify('Nombre y Código son obligatorios', 'error');
      return;
    }

    const features = featuresText.split('\n').filter(f => f.trim() !== '');
    
    // Asegurar que el período tenga un valor válido
    const periodValue = formData.period && ['mensual', 'trimestral', 'semestral', 'anual'].includes(formData.period) 
      ? formData.period 
      : 'mensual';
    
    const planData: SubscriptionPlan = {
      id: editingPlan?.id || Math.random().toString(36).substr(2, 9),
      code: formData.code!.toUpperCase(),
      name: formData.name!,
      description: formData.description || '',
      price: Number(formData.price) || 0,
      period: periodValue as 'mensual' | 'trimestral' | 'semestral' | 'anual',
      durationDays: Number(formData.durationDays) || 30,
      features,
      maxBusinesses: Number(formData.maxBusinesses) || 1,
      maxInvoicesPerMonth: Number(formData.maxInvoicesPerMonth) || 10,
      hasAIAssistant: formData.hasAIAssistant || false,
      hasPrioritySupport: formData.hasPrioritySupport || false,
      isActive: formData.isActive !== false
    };

    // Guardar en backend
    try {
      const method = editingPlan ? 'PUT' : 'POST';
      const url = editingPlan 
        ? `${API_URL}/api/subscription-plans/${editingPlan.id}` 
        : `${API_URL}/api/subscription-plans`;
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify(planData)
      });

      if (response.ok) {
        const savedPlan = await response.json();
        
        // Notificar a otras páginas que los planes se actualizaron
        localStorage.setItem('plans_updated', Date.now().toString());
        
        if (editingPlan) {
          setPlans(plans.map(p => p.id === editingPlan.id ? planData : p));
          onNotify('Plan actualizado correctamente', 'success');
        } else {
          setPlans([...plans, planData]);
          onNotify('Plan creado correctamente', 'success');
        }
      } else {
        // La respuesta no fue exitosa
        try {
          const errorText = await response.text();
          console.log('Error del servidor:', errorText);
        } catch (e) {
          console.log('Error del servidor');
        }
        
        onNotify('Error al guardar el plan. Intente de nuevo.', 'error');
      }
    } catch (error) {
      // Error de conexión
      console.error('Error de conexión:', error);
      onNotify('Error de conexión. Verifique su red.', 'error');
    }

    setShowModal(false);
  };

  const handleDelete = async (planId: string, planName: string) => {
    setConfirmModal({show: true, planId, planName});
  };

  const confirmDelete = async () => {
    const planId = confirmModal.planId;
    if (!planId) return;
    
    setConfirmModal({show: false, planId: null, planName: ''});
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/api/subscription-plans/${planId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      
      if (response.ok) {
        setPlans(plans.filter(p => p.id !== planId));
        onNotify('Plan eliminado correctamente', 'success');
      } else {
        onNotify('Error al eliminar el plan', 'error');
      }
    } catch (error) {
      console.error('Error de conexión:', error);
      onNotify('Error de conexión. Verifique su red.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (plan: SubscriptionPlan) => {
    const updatedPlan = { ...plan, isActive: !plan.isActive };
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/api/subscription-plans/${plan.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify(updatedPlan)
      });
      
      if (response.ok) {
        setPlans(plans.map(p => p.id === plan.id ? updatedPlan : p));
        onNotify(updatedPlan.isActive ? 'Plan activado correctamente' : 'Plan desactivado correctamente', 'success');
      } else {
        onNotify('Error al actualizar el plan', 'error');
      }
    } catch (error) {
      console.error('Error de conexión:', error);
      onNotify('Error de conexión. Verifique su red.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-800 dark:text-white">Gestión de Planes</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Administra los planes de suscripción del SaaS</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg"
          >
            + Nuevo Plan
          </button>
        </div>

        {/* Lista de Planes */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin text-4xl">⏳</div>
            <p className="text-slate-500 dark:text-slate-400 mt-2">Cargando planes...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map(plan => (
              <div 
                key={plan.id} 
                className={`bg-white dark:bg-slate-800 rounded-2xl shadow-xl border-2 overflow-hidden transition-all ${
                  plan.isActive ? 'border-slate-200 dark:border-slate-700' : 'border-red-200 dark:border-red-900 opacity-60'
                }`}
              >
                {/* Header del Plan */}
                <div className={`p-6 ${plan.isActive ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-red-400'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-black text-white">{plan.name}</h3>
                      <span className="text-blue-100 text-sm font-mono">{plan.code}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black text-white">${plan.price.toFixed(2)}</p>
                      <p className="text-blue-100 text-sm">/{plan.period}</p>
                    </div>
                  </div>
                </div>

                {/* Body del Plan */}
                <div className="p-6">
                  <p className="text-slate-600 dark:text-slate-300 text-sm mb-4">{plan.description}</p>
                  
                  {/* Características */}
                  <div className="space-y-2 mb-4">
                    {plan.features.slice(0, 4).map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <span className="text-green-500">✓</span>
                        <span className="text-slate-600 dark:text-slate-300">{feature}</span>
                      </div>
                    ))}
                    {plan.features.length > 4 && (
                      <p className="text-slate-400 dark:text-slate-500 text-xs">+{plan.features.length - 4} más...</p>
                    )}
                  </div>

                  {/* Límites */}
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3 mb-4">
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">LÍMITES</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-slate-400 dark:text-slate-500">Empresas:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200 ml-1">
                          {plan.maxBusinesses === -1 ? '∞' : plan.maxBusinesses}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 dark:text-slate-500">Facturas:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200 ml-1">
                          {plan.maxInvoicesPerMonth === -1 ? '∞' : plan.maxInvoicesPerMonth}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Badges de características especiales */}
                  <div className="flex gap-2 mb-4">
                    {plan.hasAIAssistant && (
                      <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 text-xs font-bold rounded-full">
                        🤖 IA
                      </span>
                    )}
                    {plan.hasPrioritySupport && (
                      <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-full">
                        ⭐ Prioritario
                      </span>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <button
                      onClick={() => handleOpenModal(plan)}
                      className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleToggleActive(plan)}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${plan.isActive ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50'}`}
                      title={plan.isActive ? 'Desactivar plan' : 'Activar plan'}
                    >
                      {plan.isActive ? '⏸️' : '▶️'}
                    </button>
                    <button
                      onClick={() => handleDelete(plan.id, plan.name)}
                      className="px-3 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de edición */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-2xl font-black text-slate-800 dark:text-white">
                  {editingPlan ? 'Editar Plan' : 'Nuevo Plan'}
                </h2>
              </div>
              
              <div className="p-6 space-y-4">
                {/* Código y Nombre */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">Código *</label>
                    <input
                      type="text"
                      value={formData.code || ''}
                      onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className="w-full p-3 border-2 border-slate-200 dark:border-slate-600 rounded-lg font-medium focus:border-blue-500 focus:outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                      placeholder="PRO, ENTERPRISE, etc."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">Nombre *</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-3 border-2 border-slate-200 dark:border-slate-600 rounded-lg font-medium focus:border-blue-500 focus:outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                      placeholder="Plan Pro, Plan Enterprise..."
                    />
                  </div>
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">Descripción</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full p-3 border-2 border-slate-200 dark:border-slate-600 rounded-lg font-medium focus:border-blue-500 focus:outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                    rows={2}
                    placeholder="Descripción del plan..."
                  />
                </div>

                {/* Precio y Período */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">Precio ($) *</label>
                    <input
                      type="number"
                      value={formData.price || 0}
                      onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                      className="w-full p-3 border-2 border-slate-200 dark:border-slate-600 rounded-lg font-medium focus:border-blue-500 focus:outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">Período</label>
                    <select
                      value={formData.period || 'mensual'}
                      onChange={e => setFormData({ ...formData, period: e.target.value as any })}
                      className="w-full p-3 border-2 border-slate-200 dark:border-slate-600 rounded-lg font-medium focus:border-blue-500 focus:outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                    >
                      <option value="mensual">Mensual</option>
                      <option value="trimestral">Trimestral</option>
                      <option value="semestral">Semestral</option>
                      <option value="anual">Anual</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">Duración (días)</label>
                    <input
                      type="number"
                      value={formData.durationDays || 30}
                      onChange={e => setFormData({ ...formData, durationDays: parseInt(e.target.value) })}
                      className="w-full p-3 border-2 border-slate-200 dark:border-slate-600 rounded-lg font-medium focus:border-blue-500 focus:outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                      min="1"
                    />
                  </div>
                </div>

                {/* Límites */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">Máx. Empresas</label>
                    <input
                      type="number"
                      value={formData.maxBusinesses || 1}
                      onChange={e => setFormData({ ...formData, maxBusinesses: parseInt(e.target.value) })}
                      className="w-full p-3 border-2 border-slate-200 dark:border-slate-600 rounded-lg font-medium focus:border-blue-500 focus:outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                      min="-1"
                    />
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Usa -1 para ilimitadas</p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">Máx. Facturas/mes</label>
                    <input
                      type="number"
                      value={formData.maxInvoicesPerMonth || 10}
                      onChange={e => setFormData({ ...formData, maxInvoicesPerMonth: parseInt(e.target.value) })}
                      className="w-full p-3 border-2 border-slate-200 dark:border-slate-600 rounded-lg font-medium focus:border-blue-500 focus:outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                      min="-1"
                    />
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Usa -1 para ilimitadas</p>
                  </div>
                </div>

                {/* Características */}
                <div>
                  <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Características (una por línea)
                  </label>
                  <textarea
                    value={featuresText}
                    onChange={e => setFeaturesText(e.target.value)}
                    className="w-full p-3 border-2 border-slate-200 dark:border-slate-600 rounded-lg font-mono text-sm focus:border-blue-500 focus:outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                    rows={4}
                    placeholder="1 empresa&#10;Facturas ilimitadas&#10;Soporte 24/7"
                  />
                </div>

                {/* Opciones adicionales */}
                <div className="flex gap-6 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.hasAIAssistant || false}
                      onChange={e => setFormData({ ...formData, hasAIAssistant: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="font-medium text-slate-700 dark:text-slate-300">Asistente IA</span>
                    <span className="text-xs text-slate-400 ml-1" title="Acceso al asistente de IA para帮助你 con tareas y preguntas">🤖</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.hasPrioritySupport || false}
                      onChange={e => setFormData({ ...formData, hasPrioritySupport: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="font-medium text-slate-700 dark:text-slate-300">Soporte Prioritario</span>
                    <span className="text-xs text-slate-400 ml-1" title="Recibe atención al cliente más rápida y preferente">🎧</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive !== false}
                      onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="font-medium text-slate-700 dark:text-slate-300">Activo</span>
                  </label>
                </div>
              </div>

              {/* Footer del Modal */}
              <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="flex-[2] py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
                >
                  {editingPlan ? 'Guardar Cambios' : 'Crear Plan'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Confirmación para Eliminar */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">¿Eliminar Plan?</h3>
              <p className="text-slate-600 dark:text-slate-300 mb-6">
                ¿Estás seguro de eliminar el plan <span className="font-semibold text-red-600">{confirmModal.planName}</span>? Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmModal({show: false, planId: null, planName: ''})}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionPlansManager;
