import React, { useState, useEffect, useId } from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

interface SaasPaymentMethodsProps {
  onNotify: (text: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

const SaasPaymentMethods: React.FC<SaasPaymentMethodsProps> = ({ onNotify }) => {
  // Estado para configuración de pagos
  const [paymentConfig, setPaymentConfig] = useState({
    bankAccounts: [] as Array<{
      id: string;
      bankName: string;
      bankAccount: string;
      bankAccountType: string;
      bankHolderName: string;
      bankHolderRuc: string;
    }>,
    paypalEnabled: true,
    transferEnabled: true,
    cardEnabled: false
  });
  const fieldId = useId();
  const [savingConfig, setSavingConfig] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);

  const loadPaymentConfig = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/admin/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data) {
          setPaymentConfig({
            bankAccounts: data.bankAccounts || [],
            paypalEnabled: data.paypalEnabled !== false,
            transferEnabled: data.transferEnabled !== false,
            cardEnabled: data.cardEnabled || false
          });
        }
      }
    } catch (error) {
      console.error('Error cargando config:', error);
      onNotify('Error al cargar configuración de pagos', 'error');
    } finally {
      setLoadingConfig(false);
    }
  };

  const savePaymentConfig = async () => {
    setSavingConfig(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(paymentConfig)
      });
      if (response.ok) {
        onNotify('Configuración de pagos guardada correctamente', 'success');
      } else {
        onNotify('Error al guardar configuración', 'error');
      }
    } catch (error) {
      onNotify('Error de conexión', 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  useEffect(() => {
    loadPaymentConfig();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8">
      <header className="mb-8">
        <h1 className="text-[#0d121b] dark:text-white text-2xl font-extrabold tracking-tight">Métodos de Pago</h1>
        <p className="text-slate-400 text-sm mt-1">Configura las pasarelas y cuentas de banco disponibles para la facturación y suscripción del SaaS.</p>
      </header>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#cfd7e7] dark:border-slate-800 overflow-hidden shadow-sm p-6 md:p-8">
        <h2 className="text-[#0d121b] dark:text-white text-lg font-bold mb-6">Configuración de Métodos de Pago</h2>
        
        {loadingConfig ? (
          <p className="text-slate-400 text-sm">Cargando configuración...</p>
        ) : (
          <div className="space-y-6">
            {/* Toggles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <label className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentConfig.paypalEnabled ? 'border-sky-500 bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                <input type="checkbox" checked={paymentConfig.paypalEnabled} onChange={e => setPaymentConfig({...paymentConfig, paypalEnabled: e.target.checked})} className="sr-only" />
                <span className="text-sm font-bold">PayPal</span>
              </label>
              <label className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentConfig.transferEnabled ? 'border-sky-500 bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                <input type="checkbox" checked={paymentConfig.transferEnabled} onChange={e => setPaymentConfig({...paymentConfig, transferEnabled: e.target.checked})} className="sr-only" />
                <span className="text-sm font-bold">Transferencia</span>
              </label>
              <label className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentConfig.cardEnabled ? 'border-sky-500 bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                <input type="checkbox" checked={paymentConfig.cardEnabled} onChange={e => setPaymentConfig({...paymentConfig, cardEnabled: e.target.checked})} className="sr-only" />
                <span className="text-sm font-bold">Tarjeta</span>
              </label>
            </div>

            {/* Datos bancarios */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wider">Cuentas Bancarias</h3>
                <button type="button" onClick={() => {
                  setPaymentConfig({
                    ...paymentConfig,
                    bankAccounts: [
                      ...paymentConfig.bankAccounts,
                      {
                        id: Math.random().toString(36).substring(7),
                        bankName: '',
                        bankAccount: '',
                        bankAccountType: 'Cuenta Corriente',
                        bankHolderName: '',
                        bankHolderRuc: ''
                      }
                    ]
                  });
                }} className="flex items-center gap-1.5 text-xs bg-sky-100 dark:bg-sky-500/20 text-sky-500 dark:text-sky-300 px-3.5 py-2 rounded-lg font-bold hover:bg-sky-200 dark:hover:bg-sky-500/30 transition-colors">
                  <PlusIcon className="w-4 h-4" /> Agregar Cuenta
                </button>
              </div>
              
              <div className="space-y-4">
                {paymentConfig.bankAccounts.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-8 bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">No hay cuentas bancarias configuradas.</p>
                )}
                {paymentConfig.bankAccounts.map((acc, index) => (
                  <div key={acc.id} className="p-5 border border-slate-200 dark:border-slate-800 rounded-xl relative bg-slate-50 dark:bg-slate-800/10">
                    <div className="absolute top-4 right-4">
                      <button type="button" onClick={() => {
                        setPaymentConfig({
                          ...paymentConfig,
                          bankAccounts: paymentConfig.bankAccounts.filter(a => a.id !== acc.id)
                        });
                      }} className="text-red-500 hover:text-red-700 p-1.5 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg transition-colors" title="Eliminar cuenta">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                    <h4 className="text-xs font-bold text-sky-600 mb-3">Cuenta #{index + 1}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor={`${fieldId}-bank-${index}`} className="text-xs font-bold text-slate-400 uppercase mb-1 block">Banco</label>
                        <input id={`${fieldId}-bank-${index}`} type="text" value={acc.bankName} onChange={e => {
                          const newAccounts = [...paymentConfig.bankAccounts];
                          newAccounts[index].bankName = e.target.value;
                          setPaymentConfig({...paymentConfig, bankAccounts: newAccounts});
                        }} className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-sm outline-none focus:border-sky-500 text-[#0d121b] dark:text-white" placeholder="Ej: Banco Pichincha" />
                      </div>
                      <div>
                        <label htmlFor={`${fieldId}-account-${index}`} className="text-xs font-bold text-slate-400 uppercase mb-1 block">N° de Cuenta</label>
                        <input id={`${fieldId}-account-${index}`} type="text" value={acc.bankAccount} onChange={e => {
                          const newAccounts = [...paymentConfig.bankAccounts];
                          newAccounts[index].bankAccount = e.target.value;
                          setPaymentConfig({...paymentConfig, bankAccounts: newAccounts});
                        }} className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-sm outline-none focus:border-sky-500 text-[#0d121b] dark:text-white" placeholder="Ej: 1234567890" />
                      </div>
                      <div>
                        <label htmlFor={`${fieldId}-accType-${index}`} className="text-xs font-bold text-slate-400 uppercase mb-1 block">Tipo de Cuenta</label>
                        <select id={`${fieldId}-accType-${index}`} value={acc.bankAccountType} onChange={e => {
                          const newAccounts = [...paymentConfig.bankAccounts];
                          newAccounts[index].bankAccountType = e.target.value;
                          setPaymentConfig({...paymentConfig, bankAccounts: newAccounts});
                        }} className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-sm outline-none focus:border-sky-500 text-[#0d121b] dark:text-white">
                          <option>Cuenta Corriente</option>
                          <option>Cuenta de Ahorros</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor={`${fieldId}-holder-${index}`} className="text-xs font-bold text-slate-400 uppercase mb-1 block">Titular</label>
                        <input id={`${fieldId}-holder-${index}`} type="text" value={acc.bankHolderName} onChange={e => {
                          const newAccounts = [...paymentConfig.bankAccounts];
                          newAccounts[index].bankHolderName = e.target.value;
                          setPaymentConfig({...paymentConfig, bankAccounts: newAccounts});
                        }} className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-sm outline-none focus:border-sky-500 text-[#0d121b] dark:text-white" placeholder="Ej: Azul S.A." />
                      </div>
                      <div className="md:col-span-2">
                        <label htmlFor={`${fieldId}-holderRuc-${index}`} className="text-xs font-bold text-slate-400 uppercase mb-1 block">RUC del Titular</label>
                        <input id={`${fieldId}-holderRuc-${index}`} type="text" value={acc.bankHolderRuc} onChange={e => {
                          const newAccounts = [...paymentConfig.bankAccounts];
                          newAccounts[index].bankHolderRuc = e.target.value;
                          setPaymentConfig({...paymentConfig, bankAccounts: newAccounts});
                        }} className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-sm outline-none focus:border-sky-500 text-[#0d121b] dark:text-white" placeholder="Ej: 0953443769" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
              <button type="submit" onClick={savePaymentConfig} disabled={savingConfig} className="w-full py-3.5 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600 transition-colors disabled:opacity-50 text-sm uppercase tracking-wider">
                {savingConfig ? 'Guardando...' : 'Guardar Configuración'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SaasPaymentMethods;
