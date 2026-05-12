import React, { useState, useEffect } from 'react';
import { ArrowPathIcon, MagnifyingGlassIcon, InboxIcon, DocumentTextIcon, ArrowUpTrayIcon, CheckIcon, XMarkIcon, BuildingOffice2Icon, CheckCircleIcon, NoSymbolIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

interface Business {
  id: string;
  name: string;
  ruc: string;
  email?: string;
  phone?: string;
}

interface ActivationRequest {
  id: string;
  businessId: string;
  plan: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  paymentMethod: string;
  amount: number;
  currency: string;
  paymentProofUrl?: string;
  paymentProofName?: string;
  referenceNumber?: string;
  adminNotes?: string;
  processedBy?: string;
  processedAt?: string;
  createdAt: string;
  business?: Business;
}

interface ActivationRequestsProps {
  onNotify: (text: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

const ActivationRequests: React.FC<ActivationRequestsProps> = ({ onNotify }) => {
  const [requests, setRequests] = useState<ActivationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [selectedRequest, setSelectedRequest] = useState<ActivationRequest | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [requestToReject, setRequestToReject] = useState<ActivationRequest | null>(null);
  const [paymentProofImage, setPaymentProofImage] = useState<string | null>(null);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/activation-requests?status=${activeTab}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Error al cargar solicitudes');
      
      const data = await response.json();
      setRequests(data.requests || []);
    } catch (error) {
      console.error(error);
      onNotify('Error al cargar las solicitudes', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
    
    // Auto-refresh cada 10 segundos para ver nuevas solicitudes
    const interval = setInterval(() => {
      loadRequests();
    }, 10000);
    
    return () => clearInterval(interval);
  }, [activeTab]);

  const filteredRequests = requests.filter(req => {
    const businessName = req.business?.name?.toLowerCase() || '';
    const businessRuc = req.business?.ruc?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();
    return businessName.includes(search) || businessRuc.includes(search);
  });

  const handleApprove = async (request: ActivationRequest) => {
    // Notificación de confirmación antes de aprobar
    onNotify('⏳ Aprobando solicitud...', 'info');
    
    setActionLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/activation-requests/${request.id}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ adminNotes: 'Aprobado por el administrador' })
      });

      if (!response.ok) throw new Error('Error al aprobar solicitud');
      
      onNotify('✅ Solicitud aprobada correctamente. Suscripción activada.', 'success');
      setSelectedRequest(null);
      loadRequests();
    } catch (error) {
      console.error(error);
      onNotify('Error al aprobar la solicitud', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectClick = (request: ActivationRequest) => {
    setRequestToReject(request);
    setRejectNotes('');
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!requestToReject) return;
    
    setActionLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/activation-requests/${requestToReject.id}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ adminNotes: rejectNotes || 'Rechazado por el administrador' })
      });

      if (!response.ok) throw new Error('Error al rechazar solicitud');
      
      onNotify('❌ Solicitud rechazada', 'info');
      setSelectedRequest(null);
      setShowRejectModal(false);
      setRequestToReject(null);
      loadRequests();
    } catch (error) {
      console.error(error);
      onNotify('Error al rechazar la solicitud', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmReject = () => {
    handleReject();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500';
      case 'APPROVED':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-500';
      case 'REJECTED':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-500';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getPlanName = (plan: string) => {
    const planNames: { [key: string]: string } = {
      'BASIC': 'Plan Básico',
      'PRO': 'Plan Profesional',
      'ENTERPRISE': 'Plan Empresarial',
      'UNLIMITED': 'Plan Ilimitado'
    };
    return planNames[plan] || plan;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-EC', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;
  const approvedCount = requests.filter(r => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter(r => r.status === 'REJECTED').length;

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] animate-in fade-in duration-500">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-slate-900 dark:text-slate-100 text-3xl font-black tracking-tight">
              Solicitudes de Activación
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-normal">
              Gestiona las aprobaciones de pagos realizados mediante transferencia bancaria.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => loadRequests()}
              className="flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold shadow-lg shadow-primary/20 hover:bg-indigo-800 transition-all"
            >
              <ArrowPathIcon className="w-[18px] h-[18px]" />
              Actualizar
            </button>
          </div>
        </div>

        <div className="mb-6 flex border-b border-slate-200 dark:border-slate-800 gap-8">
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`flex flex-col items-center justify-center border-b-2 pb-3 pt-2 transition-colors ${
              activeTab === 'PENDING' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700'
            }`}
          >
            <span className="text-sm font-bold">Pendientes ({pendingCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('APPROVED')}
            className={`flex flex-col items-center justify-center border-b-2 pb-3 pt-2 transition-colors ${
              activeTab === 'APPROVED' 
                ? 'border-emerald-500 text-emerald-600' 
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700'
            }`}
          >
            <span className="text-sm font-bold">Aprobados ({approvedCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('REJECTED')}
            className={`flex flex-col items-center justify-center border-b-2 pb-3 pt-2 transition-colors ${
              activeTab === 'REJECTED' 
                ? 'border-rose-500 text-rose-600' 
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700'
            }`}
          >
            <span className="text-sm font-bold">Rechazados ({rejectedCount})</span>
          </button>
        </div>

        <div className="mb-4">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="w-5 h-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar por empresa o RUC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <InboxIcon className="text-6xl mb-4 opacity-50 w-16 h-16" />
              <p className="text-lg font-medium">No hay solicitudes</p>
              <p className="text-sm">Las solicitudes de activación aparecerán aquí</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fecha</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Empresa</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Plan</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Monto</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Comprobante</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredRequests.map((req) => (
                    <tr 
                      key={req.id} 
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${selectedRequest?.id === req.id ? 'bg-primary/5' : ''}`}
                      onClick={() => setSelectedRequest(req)}
                    >
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {formatDate(req.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{req.business?.name || 'Empresa'}</span>
                          <span className="text-xs text-slate-500">RUC: {req.business?.ruc || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary">
                          {getPlanName(req.plan)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-slate-100">
                        ${req.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          {req.paymentProofUrl && req.paymentProofUrl.length > 10 ? (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setPaymentProofImage(req.paymentProofUrl || null);
                              }}
                              className="size-10 bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600 flex items-center justify-center hover:bg-slate-300 transition-colors cursor-pointer"
                              title="Ver comprobante"
                            >
                              <DocumentTextIcon className="w-5 h-5 text-slate-600" />
                            </button>
                          ) : (
                            <span className="size-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center" title="Sin comprobante">
                              <ArrowUpTrayIcon className="w-5 h-5 text-slate-400" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold w-fit ${getStatusColor(req.status)}`}>
                          <span className={`size-1.5 rounded-full ${
                            req.status === 'PENDING' ? 'bg-amber-500' : 
                            req.status === 'APPROVED' ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}></span>
                          {req.status === 'PENDING' ? 'Pendiente' : 
                           req.status === 'APPROVED' ? 'Aprobado' : 'Rechazado'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {req.status === 'PENDING' && (
                          <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleApprove(req)}
                              disabled={actionLoading}
                              className="size-8 flex items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-50"
                              title="Aprobar"
                            >
                              <CheckIcon className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleRejectClick(req)}
                              disabled={actionLoading}
                              className="size-8 flex items-center justify-center rounded-lg bg-rose-100 text-rose-600 hover:bg-rose-600 hover:text-white transition-all disabled:opacity-50"
                              title="Rechazar"
                            >
                              <XMarkIcon className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedRequest && (
        <aside className="w-full lg:w-[400px] border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-full overflow-y-auto shrink-0">
          <div className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Detalles de Solicitud</h2>
            <button 
              onClick={() => setSelectedRequest(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-6 flex flex-col gap-6">
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
              <div className="flex items-center gap-4 mb-4">
                <div className="size-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  <BuildingOffice2Icon className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {selectedRequest.business?.name || 'Empresa'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Solicitada hace {Math.floor((Date.now() - new Date(selectedRequest.createdAt).getTime()) / (1000 * 60 * 60))} horas
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">RUC</p>
                  <p className="font-medium">{selectedRequest.business?.ruc || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Email</p>
                  <p className="font-medium truncate">{selectedRequest.business?.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Teléfono</p>
                  <p className="font-medium">{selectedRequest.business?.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Monto</p>
                  <p className="font-bold text-primary">${selectedRequest.amount.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {selectedRequest.paymentProofUrl && (
              <div>
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                  <DocumentTextIcon className="w-[18px] h-[18px]" />
                  Comprobante de Pago
                </h4>
                {/* Debug: mostrar URL si hay problemas */}
                {process.env.NODE_ENV === 'development' && (
                  <p className="text-xs text-slate-400 mb-2 break-all">
                    URL: {selectedRequest.paymentProofUrl?.substring(0, 50)}...
                  </p>
                )}
                <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 group cursor-zoom-in">
                  <img 
                    src={selectedRequest.paymentProofUrl} 
                    alt="Comprobante de pago" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Si la imagen no carga, mostrar un mensaje
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = '<div class="flex items-center justify-center h-full text-red-500 text-sm p-4 text-center">Error al cargar imagen. La URL puede ser inválida o muy larga.</div>';
                      }
                    }}
                  />
                </div>
                {selectedRequest.referenceNumber && (
                  <p className="text-[11px] text-slate-400 mt-2 italic">
                    Ref: {selectedRequest.referenceNumber}
                  </p>
                )}
              </div>
            )}

            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Plan Solicitado</span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary">
                  {getPlanName(selectedRequest.plan)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Método de Pago</span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {selectedRequest.paymentMethod === 'TRANSFER' ? 'Transferencia' : 'Depósito'}
                </span>
              </div>
            </div>

            {selectedRequest.adminNotes && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Notas del Administrador
                </span>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {selectedRequest.adminNotes}
                </p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${getStatusColor(selectedRequest.status)}`}>
                <span className={`size-2 rounded-full ${
                  selectedRequest.status === 'PENDING' ? 'bg-amber-500' : 
                  selectedRequest.status === 'APPROVED' ? 'bg-emerald-500' : 'bg-rose-500'
                }`}></span>
                {selectedRequest.status === 'PENDING' ? 'Pendiente' : 
                 selectedRequest.status === 'APPROVED' ? 'Aprobado' : 'Rechazado'}
              </span>
              {selectedRequest.processedAt && (
                <span className="text-xs text-slate-400">
                  {formatDate(selectedRequest.processedAt)}
                </span>
              )}
            </div>

            {selectedRequest.status === 'PENDING' && (
              <div className="flex flex-col gap-3 mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(selectedRequest)}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-lg shadow-emerald-200 dark:shadow-none disabled:opacity-50"
                  >
                    <CheckCircleIcon className="w-5 h-5" />
                    {actionLoading ? 'Procesando...' : 'Validar y Activar'}
                  </button>
                </div>
                <button
                  onClick={() => handleRejectClick(selectedRequest)}
                  disabled={actionLoading}
                  className="flex items-center justify-center gap-2 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-rose-600 dark:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-sm font-bold transition-all disabled:opacity-50"
                >
                  <NoSymbolIcon className="w-[18px] h-[18px]" />
                  Rechazar Solicitud
                </button>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Modal de Rechazo Moderno */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !actionLoading && setShowRejectModal(false)}
          />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                  <NoSymbolIcon className="w-5 h-5 text-rose-600 dark:text-rose-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Rechazar Solicitud</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Ingrese el motivo del rechazo</p>
                </div>
              </div>
              <button 
                onClick={() => setShowRejectModal(false)}
                disabled={actionLoading}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                <XMarkIcon className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6">
              <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-900/50">
                <div className="flex items-start gap-3">
                  <InformationCircleIcon className="w-5 h-5 text-amber-600 dark:text-amber-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Empresa: {requestToReject?.business?.name}</p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">Plan: {getPlanName(requestToReject?.plan || '')} - ${requestToReject?.amount}</p>
                  </div>
                </div>
              </div>
              
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Motivo del rechazo <span className="text-slate-400">(opcional)</span>
              </label>
              <textarea
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="Ej: El comprobante de pago no es válido, los datos no coinciden..."
                className="w-full h-32 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
                disabled={actionLoading}
              />
            </div>
            
            {/* Footer */}
            <div className="flex gap-3 p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <button
                onClick={() => setShowRejectModal(false)}
                disabled={actionLoading}
                className="flex-1 h-12 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-600 transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmReject}
                disabled={actionLoading}
                className="flex-1 h-12 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all shadow-lg shadow-rose-200 dark:shadow-none disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <>
                    <ArrowPathIcon className="animate-spin w-5 h-5" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <NoSymbolIcon className="w-5 h-5" />
                    Rechazar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Imagen del Comprobante */}
      {paymentProofImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setPaymentProofImage(null)}
          />
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <DocumentTextIcon className="w-5 h-5 text-indigo-700 dark:text-indigo-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Comprobante de Pago</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Imagen del comprobante adjuntado</p>
                </div>
              </div>
              <button 
                onClick={() => setPaymentProofImage(null)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            {/* Body - Imagen */}
            <div className="p-4 overflow-auto max-h-[calc(90vh-120px)] flex items-center justify-center bg-slate-100 dark:bg-slate-800">
              <img 
                src={paymentProofImage} 
                alt="Comprobante de pago" 
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
              />
            </div>
            
            {/* Footer */}
            <div className="flex justify-end gap-3 p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <button
                onClick={() => setPaymentProofImage(null)}
                className="h-10 px-6 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivationRequests;
