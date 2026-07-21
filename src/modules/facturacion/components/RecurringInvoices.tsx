import React, { useState, useId } from 'react';
import { ArrowPathIcon, PlusIcon, PlayIcon, PauseIcon, CheckCircleIcon, CalendarIcon, UserIcon, DocumentTextIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { BusinessInfo, Client } from '../../../types/types';

export interface RecurringContract {
  id: string;
  clientName: string;
  clientRuc: string;
  frequency: 'SEMANAL' | 'MENSUAL' | 'TRIMESTRAL' | 'ANUAL';
  description: string;
  amount: number;
  status: 'ACTIVA' | 'PAUSADA' | 'FINALIZADA';
  lastIssuedAt?: string;
  nextExecutionDate: string;
}

interface RecurringInvoicesProps {
  businessInfo: BusinessInfo;
  clients?: Client[];
  onNotify: (msg: string, type?: any) => void;
}

export default function RecurringInvoices({ businessInfo, clients = [], onNotify }: RecurringInvoicesProps) {
  const fieldId = useId();
  const [contracts, setContracts] = useState<RecurringContract[]>([
    {
      id: 'rec-001',
      clientName: 'Corporación Alpha S.A.',
      clientRuc: '1792223344001',
      frequency: 'MENSUAL',
      description: 'Servicio de Mantenimiento de Software y Servidores',
      amount: 250.00,
      status: 'ACTIVA',
      lastIssuedAt: '2026-06-01',
      nextExecutionDate: '2026-07-01'
    },
    {
      id: 'rec-002',
      clientName: 'Importadora del Sur Cía. Ltda.',
      clientRuc: '0991122334001',
      frequency: 'MENSUAL',
      description: 'Arriendo de Local Comercial #4',
      amount: 600.00,
      status: 'ACTIVA',
      lastIssuedAt: '2026-06-05',
      nextExecutionDate: '2026-07-05'
    }
  ]);

  const [showModal, setShowModal] = useState(false);
  const [newContract, setNewContract] = useState<{
    clientName: string;
    clientRuc: string;
    frequency: 'SEMANAL' | 'MENSUAL' | 'TRIMESTRAL' | 'ANUAL';
    description: string;
    amount: number | '';
  }>({
    clientName: '',
    clientRuc: '',
    frequency: 'MENSUAL',
    description: '',
    amount: ''
  });

  const handleToggleStatus = (id: string) => {
    setContracts(prev => prev.map(c => {
      if (c.id === id) {
        const nextStatus = c.status === 'ACTIVA' ? 'PAUSADA' : 'ACTIVA';
        onNotify(`Contrato ${nextStatus === 'ACTIVA' ? 'activado' : 'pausado'} correctamente`, 'info');
        return { ...c, status: nextStatus };
      }
      return c;
    }));
  };

  const handleCreateContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContract.clientName || !newContract.description || !newContract.amount) {
      onNotify('Completa todos los campos obligatorios', 'error');
      return;
    }

    const created: RecurringContract = {
      id: `rec-${Date.now()}`,
      clientName: newContract.clientName,
      clientRuc: newContract.clientRuc || '9999999999999',
      frequency: newContract.frequency,
      description: newContract.description,
      amount: Number(newContract.amount) || 0,
      status: 'ACTIVA',
      nextExecutionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };

    setContracts([created, ...contracts]);
    setShowModal(false);
    setNewContract({ clientName: '', clientRuc: '', frequency: 'MENSUAL', description: '', amount: '' });
    onNotify('Contrato de facturación recurrente registrado exitosamente', 'success');
  };

  const handleRunBatchExecution = () => {
    const activeContracts = contracts.filter(c => c.status === 'ACTIVA');
    if (activeContracts.length === 0) {
      onNotify('No hay contratos activos para ejecutar', 'warning');
      return;
    }

    onNotify(`🚀 Se generaron ${activeContracts.length} comprobantes borrador para el período actual`, 'success');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Banner Superior */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/50 shadow-sm flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-sky-500/10 text-sky-500 rounded-3xl">
            <ArrowPathIcon className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Facturación Recurrente</h2>
            <p className="text-sm text-slate-400 font-bold">Automatiza la emisión periódica de servicios fijos y arriendos</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRunBatchExecution}
            className="px-6 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
          >
            <CheckCircleIcon className="w-5 h-5" /> Ejecutar Emisión del Período
          </button>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="px-6 py-4 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-sky-600/20 transition-all flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" /> Nuevo Contrato Recurrente
          </button>
        </div>
      </div>

      {/* Tabla de Contratos */}
      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/50 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
          <h3 className="font-black text-slate-800 dark:text-white uppercase text-sm">Contratos Recurrentes Registrados</h3>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
                <th className="text-left p-4 text-[10px] font-black text-slate-400 uppercase">Cliente / Entidad</th>
                <th className="text-left p-4 text-[10px] font-black text-slate-400 uppercase">Frecuencia</th>
                <th className="text-left p-4 text-[10px] font-black text-slate-400 uppercase">Descripción / Servicio</th>
                <th className="text-right p-4 text-[10px] font-black text-slate-400 uppercase">Monto Mensual</th>
                <th className="text-center p-4 text-[10px] font-black text-slate-400 uppercase">Próxima Emisión</th>
                <th className="text-center p-4 text-[10px] font-black text-slate-400 uppercase">Estado</th>
                <th className="text-right p-4 text-[10px] font-black text-slate-400 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map(contract => (
                <tr key={contract.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="p-4">
                    <p className="font-bold text-slate-800 dark:text-white">{contract.clientName}</p>
                    <p className="text-xs text-slate-400 font-mono">{contract.clientRuc}</p>
                  </td>
                  <td className="p-4 font-bold text-xs text-slate-600 dark:text-slate-300">
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-[10px] uppercase font-black">
                      {contract.frequency}
                    </span>
                  </td>
                  <td className="p-4 text-xs font-bold text-slate-600 dark:text-slate-300">{contract.description}</td>
                  <td className="p-4 text-right font-black text-slate-800 dark:text-white">${contract.amount.toFixed(2)}</td>
                  <td className="p-4 text-center font-mono text-xs text-slate-500">{contract.nextExecutionDate}</td>
                  <td className="p-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                      contract.status === 'ACTIVA' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                    }`}>
                      {contract.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(contract.id)}
                      className={`p-2 rounded-xl text-xs font-bold transition-colors ${
                        contract.status === 'ACTIVA' ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                      }`}
                    >
                      {contract.status === 'ACTIVA' ? <PauseIcon className="w-4 h-4 inline" /> : <PlayIcon className="w-4 h-4 inline" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nuevo Contrato Recurrente */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 dark:border-slate-700">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase">Nuevo Contrato Recurrente</h3>
              <button type="button" aria-label="Cerrar modal contrato" onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                <XMarkIcon className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreateContract} className="p-6 space-y-4">
              <div className="space-y-1">
                <label htmlFor={`${fieldId}-clientName`} className="text-xs font-bold text-slate-500 uppercase">Nombre / Razón Social del Cliente *</label>
                <input
                  id={`${fieldId}-clientName`}
                  type="text"
                  placeholder="Ej. Empresa ABC S.A."
                  value={newContract.clientName}
                  onChange={e => setNewContract({ ...newContract, clientName: e.target.value })}
                  className="w-full p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor={`${fieldId}-clientRuc`} className="text-xs font-bold text-slate-500 uppercase">RUC / Cédula</label>
                  <input
                    id={`${fieldId}-clientRuc`}
                    type="text"
                    placeholder="1790000000001"
                    value={newContract.clientRuc}
                    onChange={e => setNewContract({ ...newContract, clientRuc: e.target.value })}
                    className="w-full p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white outline-none focus:border-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor={`${fieldId}-frequency`} className="text-xs font-bold text-slate-500 uppercase">Frecuencia *</label>
                  <select
                    id={`${fieldId}-frequency`}
                    value={newContract.frequency}
                    onChange={e => setNewContract({ ...newContract, frequency: e.target.value as any })}
                    className="w-full p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white outline-none focus:border-sky-500"
                  >
                    <option value="SEMANAL">Semanal</option>
                    <option value="MENSUAL">Mensual</option>
                    <option value="TRIMESTRAL">Trimestral</option>
                    <option value="ANUAL">Anual</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor={`${fieldId}-description`} className="text-xs font-bold text-slate-500 uppercase">Concepto / Servicio *</label>
                <input
                  id={`${fieldId}-description`}
                  type="text"
                  placeholder="Ej. Honorarios Profesionales de Contabilidad"
                  value={newContract.description}
                  onChange={e => setNewContract({ ...newContract, description: e.target.value })}
                  className="w-full p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label htmlFor={`${fieldId}-amount`} className="text-xs font-bold text-slate-500 uppercase">Monto por Período ($) *</label>
                <input
                  id={`${fieldId}-amount`}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newContract.amount}
                  onChange={e => setNewContract({ ...newContract, amount: e.target.value ? parseFloat(e.target.value) : '' })}
                  className="w-full p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black dark:text-white outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-black rounded-2xl text-xs uppercase hover:bg-slate-200 transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 py-4 bg-sky-600 hover:bg-sky-500 text-white font-black rounded-2xl text-xs uppercase transition-colors shadow-lg">
                  Guardar Contrato
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
