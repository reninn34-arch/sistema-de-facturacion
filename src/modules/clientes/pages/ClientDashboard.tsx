import React, { useState, useEffect, useMemo, useId } from 'react';
import { Document } from '../../../types/types';
import { DocumentTextIcon, ArrowRightOnRectangleIcon, CheckCircleIcon, CreditCardIcon, ClockIcon, DocumentIcon, CodeBracketIcon, LockClosedIcon, QuestionMarkCircleIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import RideViewer from '../../facturacion/components/RideViewer';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

const ClientDashboard = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentsByBusiness, setDocumentsByBusiness] = useState<any[]>([]);
  const fieldId = useId();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userType, setUserType] = useState<'BUSINESS' | 'CLIENT' | null>(null);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const userStr = localStorage.getItem('clientUser');
    const client = userStr ? JSON.parse(userStr) : null;
    const key = client?.id || client?.identification || 'client';
    const saved = localStorage.getItem(`app_theme_${key}`) || localStorage.getItem('app_theme_global');
    if (saved !== null) return saved === 'dark';
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
    const userStr = localStorage.getItem('clientUser');
    const client = userStr ? JSON.parse(userStr) : null;
    const key = client?.id || client?.identification || 'client';
    localStorage.setItem(`app_theme_${key}`, next ? 'dark' : 'light');
    localStorage.setItem('app_theme_global', next ? 'dark' : 'light');
  };
  
  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' });
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'password'>('dashboard');
  const [selectedDocForRide, setSelectedDocForRide] = useState<any>(null);

  const handleDownloadXml = (doc: any) => {
    if (!doc.authorizedXml) {
      alert("Este comprobante no está autorizado por el SRI (no posee XML firmado).");
      return;
    }
    const encoder = new TextEncoder();
    const xmlBytes = encoder.encode(doc.authorizedXml);
    const blob = new Blob([xmlBytes], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.type === '00' ? 'proforma' : 'comprobante'}-${doc.number}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem('clientToken');
      const response = await fetch(`${API_URL}/api/client/documents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      // El backend devuelve { documents: [], documentsByBusiness: [] }
      if (data.documents && Array.isArray(data.documents)) {
        setDocuments(data.documents);
        setDocumentsByBusiness(data.documentsByBusiness || []);
      } else if (Array.isArray(data)) {
        // Compatible con respuesta anterior
        setDocuments(data);
      }
    } catch (error) {
      console.error("Error cargando facturas", error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar documentos según el tipo de usuario
  const filteredDocuments = useMemo(() => {
    if (!documents || documents.length === 0) return [];
    
    // Si es BUSINESS, mostrar solo facturas SaaS (invoiceType: 'SaaS')
    if (userType === 'BUSINESS') {
      return documents.filter((doc: any) => doc.invoiceType === 'SaaS');
    }
    
    // Si es CLIENT, mostrar facturas de clientes (invoiceType: 'CLIENT' o undefined)
    // También puede mostrar facturas donde entityRuc coincida con el RUC del cliente
    if (userType === 'CLIENT') {
      return documents.filter((doc: any) => 
        doc.invoiceType === 'CLIENT' || !doc.invoiceType || doc.invoiceType === undefined
      );
    }
    
    // Si no hay tipo definido, mostrar todos
    return documents;
  }, [documents, userType]);

  // Obtener título según tipo de usuario
  const getDashboardTitle = () => {
    if (userType === 'BUSINESS') {
      return 'Mis Facturas de Suscripción';
    }
    return 'Mis Transacciones';
  };

  useEffect(() => {
    const userStr = localStorage.getItem('clientUser');
    if (userStr) {
      const userData = JSON.parse(userStr);
      setUser(userData);
      // Determinar el tipo de usuario (BUSINESS o CLIENT)
      setUserType(userData.type || null);
    }
    
    // Verificar si el cliente necesita cambiar su contraseña
    const requirePasswordChange = localStorage.getItem('requirePasswordChange');
    if (requirePasswordChange === 'true') {
      setActiveTab('password');
    }
    
    fetchDocuments();
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage({ text: '', type: '' });

    if (newPassword !== confirmPassword) {
        setPasswordMessage({ text: 'Las contraseñas no coinciden', type: 'error' });
        return;
    }

    if (newPassword.length < 6) {
        setPasswordMessage({ text: 'La contraseña debe tener al menos 6 caracteres', type: 'error' });
        return;
    }

    setIsSubmittingPassword(true);
    try {
      const token = localStorage.getItem('clientToken');
      const response = await fetch(`${API_URL}/api/auth/client/change-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword })
      });
      
      if (response.ok) {
        setPasswordMessage({ text: 'Contraseña actualizada correctamente', type: 'success' });
        setNewPassword('');
        setConfirmPassword('');
        localStorage.removeItem('requirePasswordChange');
      } else {
        setPasswordMessage({ text: 'Error al actualizar contraseña', type: 'error' });
      }
    } catch (error) {
      console.error(error);
      setPasswordMessage({ text: 'Error de conexión', type: 'error' });
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const handleLogout = async () => {
    // Borrar la cookie HttpOnly clientToken en el servidor: limpiar solo
    // localStorage no cierra la sesión (la cookie seguiría autenticando al cliente).
    try {
      await fetch(`${import.meta.env.VITE_BACKEND_URL || ''}/api/logout`, { method: 'POST', credentials: 'include' });
    } catch { /* si falla, igual limpiamos abajo */ }
    localStorage.removeItem('clientToken');
    localStorage.removeItem('clientUser');
    localStorage.removeItem('requirePasswordChange');
    window.location.href = '/portal/login';
  };

  const stats = useMemo(() => {
    const totalDocs = documents.length;
    const totalAmount = documents.reduce((acc, doc) => acc + doc.total, 0);
    // Assuming 'PENDIENTE' is a status for pending review/payment
    const pendingDocs = documents.filter(d => d.status === 'PENDIENTE' || d.paymentStatus === 'PENDIENTE').length; 
    
    return { totalDocs, totalAmount, pendingDocs };
  }, [documents]);

  return (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          .font-display { font-family: 'Inter', sans-serif; }
        `}
      </style>
      
      <div className="bg-[#f6f6f8] dark:bg-[#101622] font-display text-[#0d121b] dark:text-slate-200 min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-50 w-full bg-white dark:bg-slate-900 border-b border-solid border-[#e7ebf3] dark:border-slate-800 px-4 md:px-10 lg:px-40 py-3">
          <div className="max-w-[1280px] mx-auto flex items-center justify-between whitespace-nowrap">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3 text-[#0ea5e9]">
                <div className="size-8 flex items-center justify-center bg-[#0ea5e9] rounded-lg text-white">
                  <DocumentTextIcon className="w-5 h-5" />
                </div>
                <h2 className="text-[#0d121b] dark:text-white text-lg font-bold leading-tight tracking-tight">FacturaPortal</h2>
              </div>
              <div className="hidden md:flex items-center gap-6">
                <button type="button" 
                  className={`text-sm font-medium leading-normal transition-colors ${activeTab === 'dashboard' ? 'text-[#0ea5e9] font-semibold border-b-2 border-[#0ea5e9] pb-1' : 'text-[#4c669a] dark:text-slate-400 hover:text-[#0ea5e9]'}`} 
                  onClick={() => setActiveTab('dashboard')}
                >Dashboard</button>
                {user?.type !== 'BUSINESS' && (
                  <button type="button" 
                    className={`text-sm font-medium leading-normal transition-colors ${activeTab === 'password' ? 'text-[#0ea5e9] font-semibold border-b-2 border-[#0ea5e9] pb-1' : 'text-[#4c669a] dark:text-slate-400 hover:text-[#0ea5e9]'}`} 
                    onClick={() => setActiveTab('password')}
                  >Cambiar Contraseña</button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                type="button"
                onClick={toggleDarkMode}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-amber-500 dark:hover:text-amber-400 transition-all min-w-[40px] min-h-[40px] flex items-center justify-center border border-slate-200 dark:border-slate-700"
                title={isDarkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
                aria-label="Alternar tema claro/oscuro"
              >
                {isDarkMode ? <SunIcon className="w-5 h-5 text-amber-500" /> : <MoonIcon className="w-5 h-5 text-slate-600 dark:text-slate-300" />}
              </button>
              <div className="flex items-center gap-3 pl-3 sm:pl-4 border-l border-[#cfd7e7] dark:border-slate-700">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-[#0d121b] dark:text-white leading-none">
                    {user?.type === 'BUSINESS' ? user?.name : (user?.name || 'Cliente')}
                  </p>
                  <p className="text-xs text-[#4c669a] dark:text-slate-400">
                    {user?.type === 'BUSINESS' ? 'Empresa' : 'Cliente'} - {user?.identification || 'Invitado'}
                  </p>
                </div>
                <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border-2 border-[#0ea5e9]/20 flex items-center justify-center bg-slate-100 text-[#0ea5e9] font-bold">
                    {user?.type === 'BUSINESS' ? (user?.name?.charAt(0) || 'E') : (user?.name?.charAt(0) || 'C')}
                </div>
                <button type="button" onClick={handleLogout} className="ml-2 text-slate-400 hover:text-red-500" title="Cerrar Sesión">
                    <ArrowRightOnRectangleIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-[1280px] mx-auto px-4 md:px-10 lg:px-40 py-8">
          {activeTab === 'dashboard' ? (
            <>
              {/* Summary Stats Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-slate-900 border border-[#cfd7e7] dark:border-slate-800 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[#4c669a] dark:text-slate-400 text-sm font-medium leading-normal">Total Facturas</p>
                    <DocumentTextIcon className="w-6 h-6 text-[#0ea5e9] bg-[#0ea5e9]/10 p-2 rounded-lg" />
                  </div>
                  <p className="text-[#0d121b] dark:text-white tracking-light text-3xl font-bold leading-tight">{stats.totalDocs}</p>
                  <p className="text-[#07883b] text-sm font-medium flex items-center gap-1">
                    <CheckCircleIcon className="w-[18px] h-[18px]" /> Registradas
                  </p>
                </div>
                <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-slate-900 border border-[#cfd7e7] dark:border-slate-800 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[#4c669a] dark:text-slate-400 text-sm font-medium leading-normal">Total Compras</p>
                    <CreditCardIcon className="w-6 h-6 text-[#0ea5e9] bg-[#0ea5e9]/10 p-2 rounded-lg" />
                  </div>
                  <p className="text-[#0d121b] dark:text-white tracking-light text-3xl font-bold leading-tight">${stats.totalAmount.toFixed(2)}</p>
                  <p className="text-[#4c669a] text-sm font-medium flex items-center gap-1">
                    Acumulado histórico
                  </p>
                </div>
                <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-slate-900 border border-[#cfd7e7] dark:border-slate-800 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[#4c669a] dark:text-slate-400 text-sm font-medium leading-normal">Pendientes</p>
                    <ClockIcon className="w-6 h-6 text-[#0ea5e9] bg-[#0ea5e9]/10 p-2 rounded-lg" />
                  </div>
                  <p className="text-[#0d121b] dark:text-white tracking-light text-3xl font-bold leading-tight">{stats.pendingDocs}</p>
                  <p className="text-[#4c669a] dark:text-slate-400 text-sm font-medium">Por procesar o pagar</p>
                </div>
              </div>

              {/* Transactions Table Column */}
              <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-[#0d121b] dark:text-white text-[22px] font-bold leading-tight tracking-tight">
                  {getDashboardTitle()}
                </h2>
                {userType === 'BUSINESS' && (
                  <span className="px-3 py-1 text-xs font-medium bg-sky-100 text-sky-500 dark:bg-sky-900 dark:text-blue-300 rounded-full">
                    Facturas SaaS
                  </span>
                )}
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#cfd7e7] dark:border-slate-800 overflow-hidden shadow-sm">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#f8f9fc] dark:bg-slate-800/50">
                        <th className="px-4 py-4 text-[#0d121b] dark:text-white text-xs font-bold uppercase tracking-wider">Empresa</th>
                        <th className="px-4 py-4 text-[#0d121b] dark:text-white text-xs font-bold uppercase tracking-wider">Fecha</th>
                        <th className="px-4 py-4 text-[#0d121b] dark:text-white text-xs font-bold uppercase tracking-wider">Número</th>
                        <th className="px-4 py-4 text-[#0d121b] dark:text-white text-xs font-bold uppercase tracking-wider">Tipo</th>
                        <th className="px-4 py-4 text-[#0d121b] dark:text-white text-xs font-bold uppercase tracking-wider">Total</th>
                        <th className="px-4 py-4 text-[#0d121b] dark:text-white text-xs font-bold uppercase tracking-wider text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#cfd7e7] dark:divide-slate-800">
                      {loading ? (
                        <tr><td colSpan={6} className="p-8 text-center text-slate-400">Cargando facturas...</td></tr>
                      ) : filteredDocuments.length === 0 ? (
                        <tr><td colSpan={6} className="p-8 text-center text-slate-400">No se encontraron documentos.</td></tr>
                      ) : (
                        filteredDocuments.map((doc: any) => (
                          <tr key={doc.id} className="hover:bg-[#0ea5e9]/5 transition-colors">
                            <td className="px-4 py-5 text-[#4c669a] dark:text-slate-400 text-sm">
                                {doc.business?.name || 'N/A'}
                            </td>
                            <td className="px-4 py-5 text-[#4c669a] dark:text-slate-400 text-sm">
                                {new Date(doc.issueDate).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-5 text-[#0d121b] dark:text-white text-sm font-medium">{doc.number}</td>
                            <td className="px-4 py-5 text-[#4c669a] dark:text-slate-400 text-sm">
                                {doc.type === '01' ? 'Factura' : doc.type === '04' ? 'Nota Crédito' : doc.type}
                                {doc.status === 'CANCELLED' && <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded">Anulada</span>}
                            </td>
                            <td className="px-4 py-5 text-[#0d121b] dark:text-white text-sm font-semibold">${doc.total?.toFixed(2) || '0.00'}</td>
                            <td className="px-4 py-5 text-right space-x-2">
                              <button type="button" 
                                onClick={() => setSelectedDocForRide(doc)}
                                className="inline-flex items-center justify-center p-2 rounded-lg bg-[#0ea5e9]/10 text-[#0ea5e9] hover:bg-[#0ea5e9] hover:text-white transition-all" title="Ver RIDE (PDF)">
                                <DocumentIcon className="w-5 h-5" />
                              </button>
                              <button type="button" 
                                onClick={() => handleDownloadXml(doc)}
                                disabled={!doc.authorizedXml}
                                className={`inline-flex items-center justify-center p-2 rounded-lg transition-all ${
                                  doc.authorizedXml ? 'bg-[#0ea5e9]/10 text-[#0ea5e9] hover:bg-[#0ea5e9] hover:text-white' : 'opacity-40 cursor-not-allowed text-slate-400'
                                }`} 
                                title="Descargar XML"
                              >
                                <CodeBracketIcon className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden flex flex-col divide-y divide-[#cfd7e7] dark:divide-slate-800">
                  {loading ? (
                    <div className="p-8 text-center text-slate-400">Cargando facturas...</div>
                  ) : filteredDocuments.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">No se encontraron documentos.</div>
                  ) : (
                    filteredDocuments.map((doc: any) => (
                      <div key={doc.id} className={`p-4 flex flex-col gap-3 hover:bg-[#0ea5e9]/5 transition-colors ${doc.status === 'CANCELLED' ? 'opacity-60' : ''}`}>
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-[#0d121b] dark:text-white">
                              {doc.type === '01' ? 'Factura' : doc.type === '04' ? 'Nota Crédito' : doc.type}
                              {doc.status === 'CANCELLED' && <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded">Anulada</span>}
                            </span>
                            <span className="text-xs text-[#4c669a] dark:text-slate-400 font-medium">
                              {doc.number}
                            </span>
                          </div>
                          <span className="text-base font-bold text-[#0d121b] dark:text-white">
                            ${doc.total?.toFixed(2) || '0.00'}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center pt-2">
                          <span className="text-xs text-[#4c669a] dark:text-slate-400">
                            {doc.business?.name || 'N/A'} - {new Date(doc.issueDate).toLocaleDateString()}
                          </span>
                          <div className="flex gap-2">
                            <button type="button" 
                              onClick={() => setSelectedDocForRide(doc)}
                              className="inline-flex items-center justify-center p-2 rounded-lg bg-[#0ea5e9]/10 text-[#0ea5e9] hover:bg-[#0ea5e9] hover:text-white transition-all" title="Ver RIDE (PDF)">
                              <DocumentIcon className="w-5 h-5" />
                            </button>
                            <button type="button" 
                              onClick={() => handleDownloadXml(doc)}
                              disabled={!doc.authorizedXml}
                              className={`inline-flex items-center justify-center p-2 rounded-lg transition-all ${
                                doc.authorizedXml ? 'bg-[#0ea5e9]/10 text-[#0ea5e9] hover:bg-[#0ea5e9] hover:text-white' : 'opacity-40 cursor-not-allowed text-slate-400'
                              }`} 
                              title="Descargar XML"
                            >
                              <CodeBracketIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            </>
          ) : (
            /* Configuration Column (Password) */
            <div className="max-w-2xl mx-auto flex flex-col gap-4">
              <div className="px-2">
                <h2 className="text-[#0d121b] dark:text-white text-[22px] font-bold leading-tight tracking-tight">Seguridad de la Cuenta</h2>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#cfd7e7] dark:border-slate-800 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <LockClosedIcon className="w-6 h-6 text-[#0ea5e9]" />
                  <h3 className="text-lg font-bold text-[#0d121b] dark:text-white">Cambiar Contraseña</h3>
                </div>
                
                {passwordMessage.text && (
                    <div className={`mb-4 p-3 rounded-lg text-xs ${passwordMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {passwordMessage.text}
                    </div>
                )}

                <form className="flex flex-col gap-5" onSubmit={handleChangePassword}>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={`${fieldId}-newPassword`} className="text-sm font-semibold text-[#4c669a] dark:text-slate-400">Nueva Contraseña</label>
                    <input
                        id={`${fieldId}-newPassword`}
                        className="rounded-lg border-[#cfd7e7] dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-[#0ea5e9] focus:ring-[#0ea5e9] text-sm w-full p-2.5 border"
                        placeholder="mínimo 6 caracteres"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={`${fieldId}-confirmPassword`} className="text-sm font-semibold text-[#4c669a] dark:text-slate-400">Confirmar Nueva Contraseña</label>
                    <input
                        id={`${fieldId}-confirmPassword`}
                        className="rounded-lg border-[#cfd7e7] dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-[#0ea5e9] focus:ring-[#0ea5e9] text-sm w-full p-2.5 border"
                        placeholder="Repita la contraseña"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                  </div>
                  <button 
                    className="mt-2 flex w-full cursor-pointer items-center justify-center rounded-xl h-11 px-4 bg-[#0ea5e9] text-white text-sm font-bold leading-normal transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-70" 
                    type="submit"
                    disabled={isSubmittingPassword}
                  >
                    {isSubmittingPassword ? 'Actualizando...' : 'Actualizar Contraseña'}
                  </button>
                </form>
                <div className="mt-8 pt-6 border-t border-[#cfd7e7] dark:border-slate-800">
                  <p className="text-xs text-[#4c669a] dark:text-slate-500 text-center">
                    asegúrese de usar una contraseña segura.
                  </p>
                </div>
              </div>

              {/* Quick Help Card */}
              <div className="bg-[#0ea5e9]/5 dark:bg-[#0ea5e9]/10 rounded-xl p-6 border border-[#0ea5e9]/10">
                <div className="flex items-start gap-3">
                  <QuestionMarkCircleIcon className="w-6 h-6 text-[#0ea5e9]" />
                  <div>
                    <h4 className="text-sm font-bold text-[#0d121b] dark:text-white mb-1">¿Necesitas ayuda?</h4>
                    <p className="text-xs text-[#4c669a] dark:text-slate-400 leading-relaxed mb-3">
                      Si tienes problemas para visualizar tus facturas, contacta a nuestro soporte técnico.
                    </p>
                    <div className="flex flex-wrap gap-2.5 mt-2">
                      <a href="https://wa.me/593999999999?text=Hola%2C%20necesito%20soporte%20t%C3%A9cnico%20en%20el%20portal%20de%20facturaci%C3%B3n" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366] text-white text-xs font-bold hover:bg-[#1ebe5d] transition-all shadow-sm">
                        💬 Soporte por WhatsApp
                      </a>
                      <a href="mailto:info@azulpro.com?subject=Soporte%20Tecnico%20Portal%20Clientes" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0ea5e9] text-white text-xs font-bold hover:bg-sky-600 transition-all shadow-sm">
                        ✉️ Correo Electrónico
                      </a>
                      <a href="/ayuda" target="_blank" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-all">
                        ❓ Preguntas Frecuentes
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
        
        {/* Footer (Mini) */}
        <footer className="max-w-[1280px] mx-auto px-4 md:px-10 lg:px-40 py-10">
          <div className="border-t border-[#cfd7e7] dark:border-slate-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-[#4c669a] dark:text-slate-500">© {new Date().getFullYear()} FacturaPortal. Todos los derechos reservados.</p>
            <div className="flex gap-6">
              <a className="text-xs text-[#4c669a] dark:text-slate-500 hover:text-[#0ea5e9]" href="#">Términos</a>
              <a className="text-xs text-[#4c669a] dark:text-slate-500 hover:text-[#0ea5e9]" href="#">Privacidad</a>
              <a className="text-xs text-[#4c669a] dark:text-slate-500 hover:text-[#0ea5e9]" href="#">Soporte</a>
            </div>
          </div>
        </footer>
        {selectedDocForRide && (
          <RideViewer 
            document={selectedDocForRide} 
            businessInfo={selectedDocForRide.business} 
            items={selectedDocForRide.items || []} 
            onClose={() => setSelectedDocForRide(null)} 
          />
        )}
      </div>
    </>
  );
};

export default ClientDashboard;
