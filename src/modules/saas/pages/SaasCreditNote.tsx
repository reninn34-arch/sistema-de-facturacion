import React, { useState, useEffect } from 'react';
import { Document, DocumentType, SriStatus, InvoiceItem } from '../../../types/types';
import {
  MagnifyingGlassIcon,
  PencilSquareIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  PencilIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

// Interfaces
interface Business {
  id: string;
  name: string;
  ruc: string;
  email?: string;
  subscriptionEnd: string | null;
  subscriptionStart?: string | null;
  isActive: boolean;
  plan: string;
  subscriptionStatus: string;
}

interface SaasCreditNoteProps {
  businesses: Business[];
  documents?: Document[];
  onNotify: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  onCreditNoteCreated?: (creditNote: any) => void;
}

// Razones para nota de crédito (SRI) - Solo 2 categorías principales
const CREDIT_NOTE_REASONS = [
  // Devolución/Anulación
  { code: '01', description: 'Devolución/Anulación', category: 'Devolución/Anulación' },
  // Modificación/Corrección
  { code: '04', description: 'Modificación/Corrección', category: 'Modificación/Corrección' },
];

// Interface para nota de crédito
interface CreditNoteRecord {
  id: string;
  numero: string;
  fecha: string;
  invoiceNumber: string;
  cliente: string;
  razon: string;
  monto: number;
  estado: string;
}

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

export default function SaasCreditNote({ businesses, documents, onNotify }: SaasCreditNoteProps) {
  // Estado para mostrar facturas o notas de crédito
  const [activeTab, setActiveTab] = useState<'invoices' | 'credit-notes'>('invoices');
  
  // Estado para facturas
  const [invoices, setInvoices] = useState<Document[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [searchInvoice, setSearchInvoice] = useState('');
  
  // Estado para nota de crédito
  const [selectedInvoice, setSelectedInvoice] = useState<Document | null>(null);
  const [reason, setReason] = useState('01');
  const [customReason, setCustomReason] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [additionalInfo, setAdditionalInfo] = useState('');
  
  // Estados de procesamiento
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [processMessage, setProcessMessage] = useState('');
  
  // Lista de notas de crédito creadas
  const [creditNotes, setCreditNotes] = useState<CreditNoteRecord[]>([]);
  const [loadingCreditNotes, setLoadingCreditNotes] = useState(true);

  // Cargar facturas
  useEffect(() => {
    const loadInvoices = async () => {
      setLoadingInvoices(true);
      
      // Usar ruta relativa para el proxy de Vite en desarrollo
      const apiUrl = import.meta.env.VITE_BACKEND_URL ? `${import.meta.env.VITE_BACKEND_URL}/api` : '/api';
      
      // Siempre intentar cargar del backend para asegurar datos actualizados
      try {
        const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
        
        if (!token) {
          if (documents && documents.length > 0) {
            const filteredInvoices = documents.filter((doc: any) => 
              (doc.type === '01' || doc.type === '1' || doc.type === 'INVOICE' || doc.type === DocumentType.INVOICE) &&
              doc.status !== 'CANCELLED'
            );
            setInvoices(filteredInvoices);
          }
          setLoadingInvoices(false);
          return;
        }
        
        const apiUrl = import.meta.env.VITE_BACKEND_URL ? `${import.meta.env.VITE_BACKEND_URL}/api` : '/api';
        const response = await fetch(`${apiUrl}/admin/documents?type=INVOICE`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          const allDocs = Array.isArray(data) ? data : data.documents || [];
          
          const filteredInvoices = allDocs.filter((doc: any) => 
            (doc.type === '01' || doc.type === '1' || doc.type === 'INVOICE' || doc.type === DocumentType.INVOICE) &&
            doc.status !== 'CANCELLED'
          );
          
          setInvoices(filteredInvoices);
        } else if (response.status === 401 || response.status === 403) {
          if (documents && documents.length > 0) {
            const filteredInvoices = documents.filter((doc: any) => 
              (doc.type === '01' || doc.type === '1' || doc.type === 'INVOICE' || doc.type === DocumentType.INVOICE) &&
              doc.status !== 'CANCELLED'
            );
            setInvoices(filteredInvoices);
          }
        } else {
          if (documents && documents.length > 0) {
            const filteredInvoices = documents.filter((doc: any) => 
              (doc.type === '01' || doc.type === '1' || doc.type === 'INVOICE' || doc.type === DocumentType.INVOICE) &&
              doc.status !== 'CANCELLED'
            );
            setInvoices(filteredInvoices);
          }
        }
      } catch (error) {
        if (documents && documents.length > 0) {
          const filteredInvoices = documents.filter((doc: any) => 
            (doc.type === '01' || doc.type === '1' || doc.type === 'INVOICE' || doc.type === DocumentType.INVOICE) &&
            doc.status !== 'CANCELLED'
          );
          setInvoices(filteredInvoices);
        }
      }
      setLoadingInvoices(false);
    };
    
    loadInvoices();
  }, [documents]);

  // Cargar notas de crédito existentes
  useEffect(() => {
    const loadCreditNotes = async () => {
      setLoadingCreditNotes(true);
      try {
        const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
        
        if (!token) {
          setLoadingCreditNotes(false);
          return;
        }
        
        // Cargar todos los documentos
        const apiUrl = import.meta.env.VITE_BACKEND_URL ? `${import.meta.env.VITE_BACKEND_URL}/api` : '/api';
        const response = await fetch(`${apiUrl}/documents`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          const allDocs = Array.isArray(data) ? data : data.documents || [];
          
          // Filtrar solo notas de crédito (tipo '04' o 'CREDIT_NOTE')
          const creditNotesData = allDocs.filter((doc: any) => 
            doc.type === '04' || doc.type === '4' || doc.type === 'CREDIT_NOTE' || doc.type === DocumentType.CREDIT_NOTE
          );
          
          const notes = creditNotesData.map((doc: any) => ({
            id: doc.id,
            numero: doc.number,
            fecha: doc.issueDate,
            invoiceNumber: doc.modifiesDocument?.number || doc.relatedDocumentNumber || doc.relatedDocumentNumber || '',
            cliente: doc.entityName,
            razon: doc.creditNoteReason ? CREDIT_NOTE_REASONS.find(r => r.code === doc.creditNoteReason)?.description || doc.creditNoteReason : '',
            monto: doc.total,
            estado: doc.status
          }));
          setCreditNotes(notes);
        }
      } catch (error) {
        // Error al cargar notas de crédito
      }
      setLoadingCreditNotes(false);
    };
    
    loadCreditNotes();
  }, []);

  // Estados para edición de items
  const [editingMode, setEditingMode] = useState<'edit' | 'view'>('view');
  const [priceIncludesIva, setPriceIncludesIva] = useState(false);

  // Cuando se selecciona una factura
  useEffect(() => {
    // Determinar el modo de edición según la razón
    if (reason === '04') {
      // Corrección de datos - permitir edición
      setEditingMode('edit');
    } else if (reason === '02') {
      // Anulación - pre-llenar todas las cantidades
      setEditingMode('view');
    }
    
    if (selectedInvoice && selectedInvoice.items && selectedInvoice.items.length > 0) {
      // Inicializar con todos los items de la factura
      setItems(selectedInvoice.items.map(item => ({
        ...item,
        quantity: 0, // Usuario debe ingresar cantidad a devolver
      })));
    } else if (selectedInvoice) {
      // Si no hay items en la factura, permitir agregar manualmente
      // Crear un item vacío con el total de la factura
      setItems([{
        productId: 'manual',
        description: 'Producto/devolución',
        quantity: 1,
        unitPrice: selectedInvoice.total || 0,
        discount: 0,
        taxRate: 15,
        total: selectedInvoice.total || 0,
        type: 'FISICO'
      }]);
    } else {
      setItems([]);
    }
  }, [selectedInvoice, reason]);

  // Filtrar facturas por búsqueda
  const filteredInvoices = invoices.filter(inv =>
    !searchInvoice ||
    inv.number?.toLowerCase().includes(searchInvoice.toLowerCase()) ||
    inv.entityName?.toLowerCase().includes(searchInvoice.toLowerCase()) ||
    inv.accessKey?.includes(searchInvoice)
  );

  // Calcular totales
  const calculateTotals = () => {
    const validItems = items.filter(item => item.quantity > 0);
    
    // Calcular subtotales
    let subtotal0 = 0;
    let subtotal12 = 0;
    
    validItems.forEach(item => {
      let unitPrice = item.unitPrice;
      
      // Si el precio incluye IVA, separarlo
      if (priceIncludesIva && item.taxRate > 0) {
        unitPrice = unitPrice / (1 + item.taxRate / 100);
      }
      
      const itemSubtotal = item.quantity * unitPrice - item.discount;
      
      if (item.taxRate === 0) {
        subtotal0 += itemSubtotal;
      } else {
        subtotal12 += itemSubtotal;
      }
    });
    
    // Calcular IVA basado en el taxRate de cada item (puede ser 0%, 12%, 14%, etc.)
    const tax12 = validItems.reduce((sum, item) => {
      if (item.taxRate > 0) {
        let unitPrice = item.unitPrice;
        // Si el precio incluye IVA, usar el precio sin IVA
        if (priceIncludesIva) {
          unitPrice = unitPrice / (1 + item.taxRate / 100);
        }
        const itemSubtotal = item.quantity * unitPrice - item.discount;
        return sum + (itemSubtotal * item.taxRate / 100);
      }
      return sum;
    }, 0);
    
    const total = subtotal0 + subtotal12 + tax12;
    return { subtotal0, subtotal12, tax12, total };
  };

  // Cambiar cantidad de item
  const handleItemQuantityChange = (index: number, quantity: number) => {
    const newItems = [...items];
    const maxQty = selectedInvoice?.items?.[index]?.quantity || 0;
    newItems[index].quantity = Math.min(Math.max(0, quantity), maxQty);
    newItems[index].total = newItems[index].quantity * newItems[index].unitPrice - newItems[index].discount;
    setItems(newItems);
  };
  
  // Seleccionar todas las cantidades para anulación
  const handleSelectAllForAnulation = () => {
    if (!selectedInvoice?.items) return;
    
    const newItems = items.map((item, index) => ({
      ...item,
      quantity: selectedInvoice.items?.[index]?.quantity || item.quantity || 0
    }));
    setItems(newItems);
  };

  // Generar nota de crédito
  const handleProcess = async () => {
    if (!selectedInvoice) {
      onNotify('Debe seleccionar una factura', 'warning');
      return;
    }

    const validItems = items.filter(item => item.quantity > 0);
    if (validItems.length === 0) {
      onNotify('Debe especificar al menos un item a devolver', 'warning');
      return;
    }

    setIsProcessing(true);
    setProcessStatus('processing');
    setProcessMessage('Generando nota de crédito...');

    const { total } = calculateTotals();

    try {
      const token = localStorage.getItem('adminToken');
      
      // Usar ruta relativa para el proxy de Vite en desarrollo
      const apiUrl = import.meta.env.VITE_BACKEND_URL ? `${import.meta.env.VITE_BACKEND_URL}/api` : '/api';
      
      // Obtener el businessId de la factura seleccionada
      const businessId = selectedInvoice.businessId;
      
      // Calcular los días a devolver basándose en el monto
      const planPrices: Record<string, number> = { 'FREE': 0, 'BASIC': 35.00, 'GASTRONOMICO': 90.00, 'PRO': 150.00, 'ENTERPRISE': 250.00, 'UNLIMITED': 0 };
      const businessPlan = (selectedInvoice as any).plan || (selectedInvoice as any).business?.plan || 'BASIC';
      const monthlyPrice = planPrices[businessPlan] || 35.00;
      const dailyRate = monthlyPrice / 30;
      const daysToRefund = Math.ceil(total / dailyRate);
      
      // Llamar al endpoint correcto de SaaS para procesar la nota de crédito
      const response = await fetch(`${apiUrl}/admin/subscriptions/credit-note`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          businessId: businessId,
          reason: reason,
          daysToRefund: daysToRefund,
          customReason: customReason,
          additionalInfo: additionalInfo,
          documentId: selectedInvoice.id,
          invoiceNumber: selectedInvoice.number
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        const newCreditNote: CreditNoteRecord = {
          id: data.creditNote?.id || Date.now().toString(),
          numero: data.creditNote?.numero || `001-002-${Date.now()}`,
          fecha: data.creditNote?.fecha || new Date().toLocaleDateString('es-EC'),
          invoiceNumber: selectedInvoice.number,
          cliente: selectedInvoice.entityName,
          razon: CREDIT_NOTE_REASONS.find(r => r.code === reason)?.description || customReason,
          monto: total,
          estado: data.creditNote?.estado || 'AUTORIZADA'
        };
        
        setCreditNotes([newCreditNote, ...creditNotes]);
        
        setProcessStatus('success');
        setProcessMessage(`Nota de crédito ${newCreditNote.numero} procesada correctamente.`);
        
        onNotify(
          `✅ Nota de crédito ${newCreditNote.numero} generada\n` +
          `📄 Factura: ${selectedInvoice.number}\n` +
          `💰 Monto: ${total.toFixed(2)}`,
          'success'
        );
        
        setLoadingInvoices(true);
        try {
          const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
          const responseDocs = await fetch(`${apiUrl}/admin/documents?type=INVOICE`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (responseDocs.ok) {
            const dataDocs = await responseDocs.json();
            const allDocs = Array.isArray(dataDocs) ? dataDocs : dataDocs.documents || [];
            const filteredInvoices = allDocs.filter((doc: any) => 
              (doc.type === '01' || doc.type === '1' || doc.type === 'INVOICE' || doc.type === DocumentType.INVOICE) &&
              doc.status !== 'CANCELLED'
            );
            setInvoices(filteredInvoices);
          }
        } catch (error) {
          // Error al recargar
        }
        setLoadingInvoices(false);
        
        resetForm();
        return;
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Error del servidor');
      }
    } catch (error: any) {
      
      // MODO DEMO: Simular procesamiento si el backend no está disponible
      const creditNoteNumber = `001-002-${String(Math.floor(Math.random() * 999999)).padStart(7, '0')}`;
      
      const newCreditNote: CreditNoteRecord = {
        id: Date.now().toString(),
        numero: creditNoteNumber,
        fecha: new Date().toLocaleDateString('es-EC'),
        invoiceNumber: selectedInvoice.number,
        cliente: selectedInvoice.entityName,
        razon: CREDIT_NOTE_REASONS.find(r => r.code === reason)?.description || customReason,
        monto: total,
        estado: 'AUTORIZADA (DEMO)'
      };
      
      setCreditNotes([newCreditNote, ...creditNotes]);
      
      setProcessStatus('success');
      setProcessMessage(`[MODO DEMO] Nota de crédito ${creditNoteNumber} procesada.`);
      
      onNotify(
        `✅ [MODO DEMO] Nota de crédito ${creditNoteNumber} generada\n` +
        `📄 Factura: ${selectedInvoice.number}\n` +
        `💰 Monto: ${total.toFixed(2)}`,
        'success'
      );
      
      // En modo demo, actualizar localmente el estado de la factura
      setInvoices(prevInvoices => prevInvoices.map(inv => 
        inv.id === selectedInvoice.id 
          ? { ...inv, status: 'CANCELLED' as any } 
          : inv
      ));
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        setProcessStatus('idle');
        setProcessMessage('');
      }, 3000);
    }
  };

  // Reset formulario
  const resetForm = () => {
    setSelectedInvoice(null);
    setReason('01');
    setCustomReason('');
    setItems([]);
    setAdditionalInfo('');
    setProcessStatus('idle');
    setProcessMessage('');
  };

  // Función auxiliar para contar items válidos
  const validItemsCount = () => items.filter(item => item.quantity > 0).length;

  const { subtotal0, subtotal12, tax12, total } = calculateTotals();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50 dark:from-slate-900 dark:to-sky-900/20 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-800 dark:text-white">Notas de Crédito</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Devoluciones, anulaciones y correcciones de facturas</p>
            </div>
            
            {/* Tabs */}
            <div className="flex bg-white dark:bg-slate-800 rounded-lg p-1 shadow-md">
              <button type="button"
                onClick={() => setActiveTab('invoices')}
                className={`px-4 py-2 rounded-md font-medium transition-all ${
                  activeTab === 'invoices'
                    ? 'bg-sky-500 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <DocumentTextIcon className="w-4 h-4 inline" /> Facturas
              </button>
              <button type="button"
                onClick={() => setActiveTab('credit-notes')}
                className={`px-4 py-2 rounded-md font-medium transition-all ${
                  activeTab === 'credit-notes'
                    ? 'bg-sky-500 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <PencilSquareIcon className="w-4 h-4 inline" /> Notas de Crédito
              </button>
            </div>
          </div>
        </div>

        {activeTab === 'invoices' ? (
          <>
            {/* Selección de Factura */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6 md:p-8 mb-8">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                <MagnifyingGlassIcon className="w-6 h-6" />
                1. Seleccione la Factura a Modificar
              </h2>

              <div className="mb-4">
                <input
                  type="text"
                  value={searchInvoice}
                  onChange={(e) => setSearchInvoice(e.target.value)}
                  placeholder="Buscar por número, cliente o clave de acceso..."
                  className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>

              {loadingInvoices ? (
                <div className="text-center py-8 text-slate-500">Cargando facturas...</div>
              ) : filteredInvoices.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  {invoices.length === 0 
                    ? <div>
                        <p>No hay facturas disponibles.</p>
                        <p className="text-sm mt-2">Cree una factura primero desde el módulo de Emisión.</p>
                        <p className="text-xs mt-1 text-slate-400">Debug: documents prop = {documents?.length || 0}, invoices state = {invoices.length}</p>
                      </div>
                    : 'No se encontraron facturas con ese criterio de búsqueda'
                  }
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                  {filteredInvoices.map(invoice => (
                    <div
                      key={invoice.id}
                      onClick={() => setSelectedInvoice(invoice)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedInvoice?.id === invoice.id
                          ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/30'
                          : 'border-slate-200 dark:border-slate-600 hover:border-sky-300'
                      }`}
                    >
                      <div className="font-semibold text-slate-800 dark:text-white">{invoice.number}</div>
                      <div className="text-sm text-slate-600 dark:text-slate-300">{invoice.entityName}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">{invoice.issueDate}</div>
                      <div className="text-lg font-bold text-sky-600 mt-2">
                        ${invoice.total.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Formulario de Nota de Crédito */}
            {selectedInvoice && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6 md:p-8 mb-8">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                  <PencilSquareIcon className="w-6 h-6" />
                  2. Complete los Datos de la Nota de Crédito
                </h2>

                {/* Factura seleccionada */}
                <div className="mb-6 p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
                  <div className="text-sm text-slate-500 dark:text-slate-400">Factura seleccionada:</div>
                  <div className="font-semibold text-slate-800 dark:text-white">{selectedInvoice.number}</div>
                  <div className="text-slate-600 dark:text-slate-300">{selectedInvoice.entityName} - ${selectedInvoice.total.toFixed(2)}</div>
                </div>

                {/* Razón */}
                <div className="mb-6">
                  <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-2">
                    Razón de la Nota de Crédito
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                  >
                    <optgroup label="DEVOLUCION/ANULACION">
                      <option value="01">01 - Devolución/Anulación</option>
                    </optgroup>
                    <optgroup label="MODIFICACION/CORRECCION">
                      <option value="04">04 - Modificación/Corrección</option>
                    </optgroup>
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    Seleccione la razón según el motivo de la nota de crédito
                  </p>
                  
                  {/* Botón para anulación */}
                  {reason === '01' && (
                    <button
                      type="button"
                      onClick={handleSelectAllForAnulation}
                      className="mt-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-all"
                    >
                      <XMarkIcon className="w-4 h-4 inline" /> Anular todos los items
                    </button>
                  )}
                  
                  {/* Información según la razón */}
                  {reason === '04' && (
                    <p className="text-xs text-sky-500 dark:text-sky-400 mt-2">
                      <PencilIcon className="w-4 h-4 inline" /> Modificación/Corrección: Puede editar la descripción, precio y cantidad de los items.
                    </p>
                  )}
                </div>

                {/* Toggle Precio incluye IVA */}
                <div className="mb-6 flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={priceIncludesIva}
                      onChange={(e) => setPriceIncludesIva(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300 dark:peer-focus:ring-sky-800 rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-sky-500"></div>
                    <span className="ml-3 text-sm font-medium text-slate-600 dark:text-slate-300">
                      Precio incluye IVA
                    </span>
                  </label>
                  <span className="text-xs text-slate-500">
                    (Marque si el precio digitado ya tiene el IVA incluido)
                  </span>
                </div>

                {/* Items a devolver */}
                <div className="mb-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                    <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                      Items a Devolver
                    </label>
                    {items.length === 0 && (
                      <span className="text-xs text-amber-600 dark:text-amber-400">
                        <ExclamationTriangleIcon className="w-4 h-4 inline" /> Los items de la factura no están disponibles. Agregue los items manualmente.
                      </span>
                    )}
                  </div>
                  <div className="overflow-x-auto border border-slate-300 dark:border-slate-600 rounded-lg">
                    <table className="w-full text-sm min-w-[600px]">
                      <thead className="bg-slate-100 dark:bg-slate-700">
                        <tr>
                          <th className="p-2 sm:p-3 text-left text-slate-600 dark:text-slate-300 text-xs">Descripción</th>
                          <th className="p-2 sm:p-3 text-center text-slate-600 dark:text-slate-300 text-xs w-20">IVA</th>
                          <th className="p-2 sm:p-3 text-center text-slate-600 dark:text-slate-300 text-xs w-20">Orig.</th>
                          <th className="p-2 sm:p-3 text-center text-slate-600 dark:text-slate-300 text-xs w-24">Cant.</th>
                          <th className="p-2 sm:p-3 text-right text-slate-600 dark:text-slate-300 text-xs w-28">Precio</th>
                          <th className="p-2 sm:p-3 text-right text-slate-600 dark:text-slate-300 text-xs w-24">Total</th>
                          <th className="p-2 sm:p-3 text-center text-slate-600 dark:text-slate-300 text-xs w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, index) => (
                          <tr key={index} className="border-t border-slate-200 dark:border-slate-600">
                            <td className="p-3">
                              <input
                                type="text"
                                value={item.description || item.name || ''}
                                onChange={(e) => {
                                  const newItems = [...items];
                                  newItems[index].description = e.target.value;
                                  setItems(newItems);
                                }}
                                placeholder="Descripción del producto"
                                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                              />
                            </td>
                            <td className="p-3 text-center">
                              <select
                                value={item.taxRate || 0}
                                onChange={(e) => {
                                  const newItems = [...items];
                                  newItems[index].taxRate = parseInt(e.target.value) || 0;
                                  setItems(newItems);
                                }}
                                className="p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                              >
                                <option value={0}>0%</option>
                                <option value={15}>15%</option>
                              </select>
                            </td>
                            <td className="p-3 text-center text-slate-600 dark:text-slate-300">{selectedInvoice?.items?.[index]?.quantity || (item.productId ? item.quantity : '-')}</td>
                            <td className="p-3 text-center">
                              <input
                                type="number"
                                min="0"
                                max={selectedInvoice?.items?.[index]?.quantity || item.quantity || 999}
                                value={item.quantity}
                                onChange={(e) => handleItemQuantityChange(index, parseInt(e.target.value) || 0)}
                                className="w-20 p-2 border border-slate-300 dark:border-slate-600 rounded text-center bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                              />
                            </td>
                            <td className="p-3 text-right">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.unitPrice}
                                onChange={(e) => {
                                  const newItems = [...items];
                                  newItems[index].unitPrice = parseFloat(e.target.value) || 0;
                                  // Calcular total considerando si el precio incluye IVA
                                  if (priceIncludesIva && item.taxRate > 0) {
                                    const priceWithoutIva = newItems[index].unitPrice / (1 + item.taxRate / 100);
                                    newItems[index].total = newItems[index].quantity * priceWithoutIva - newItems[index].discount;
                                  } else {
                                    newItems[index].total = newItems[index].quantity * newItems[index].unitPrice - newItems[index].discount;
                                  }
                                  setItems(newItems);
                                }}
                                className="w-24 p-2 border border-slate-300 dark:border-slate-600 rounded text-right bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                              />
                            </td>
                            <td className="p-2 sm:p-3 text-right text-slate-800 dark:text-white font-medium">
                              ${priceIncludesIva && item.taxRate > 0 
                                ? ((item.quantity * item.unitPrice / (1 + item.taxRate / 100)) - item.discount).toFixed(2)
                                : (item.quantity * item.unitPrice - item.discount).toFixed(2)}
                            </td>
                            <td className="p-2 sm:p-3 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  const newItems = items.filter((_, i) => i !== index);
                                  setItems(newItems);
                                }}
                                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"
                                title="Eliminar item"
                              >
                                <XMarkIcon className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {items.length > 0 && (
                          <tr>
                            <td colSpan={7} className="p-3">
                              <button aria-label="Acción"
                                type="button"
                                onClick={() => setItems([...items, {
                                  productId: 'manual',
                                  description: '',
                                  quantity: 1,
                                  unitPrice: 0,
                                  discount: 0,
                                  taxRate: 15,
                                  total: 0,
                                  type: 'FISICO'
                                }])}
                                className="text-sm text-sky-500 hover:text-sky-800 dark:text-sky-400 dark:hover:text-blue-300"
                              >
                                + Agregar otro item
                              </button>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Totales */}
                <div className="mb-6 p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span className="text-slate-600 dark:text-slate-300">Subtotal 0%:</span>
                    <span className="text-slate-800 dark:text-white">${subtotal0.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-slate-600 dark:text-slate-300">Subtotal 12%:</span>
                    <span className="text-slate-800 dark:text-white">${subtotal12.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-slate-600 dark:text-slate-300">IVA 12%:</span>
                    <span className="text-slate-800 dark:text-white">${tax12.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t border-slate-300 dark:border-slate-500 pt-2 mt-2">
                    <span className="text-slate-800 dark:text-white">Total:</span>
                    <span className="text-sky-600">${total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Información adicional */}
                <div className="mb-6">
                  <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-2">
                    Información Adicional (Opcional)
                  </label>
                  <textarea
                    value={additionalInfo}
                    onChange={(e) => setAdditionalInfo(e.target.value)}
                    placeholder="Agregue información adicional si es necesario..."
                    rows={3}
                    className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                  />
                </div>

                {/* Botones */}
                <div className="flex gap-4">
                  <button type="button"
                    onClick={handleProcess}
                    disabled={isProcessing || validItemsCount() === 0}
                    className={`flex-1 py-3 px-6 rounded-lg font-bold text-white transition-all ${
                      isProcessing || validItemsCount() === 0
                        ? 'bg-slate-400 cursor-not-allowed'
                        : 'bg-sky-500 hover:bg-sky-600 shadow-lg'
                    }`}
                  >
                    {isProcessing ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Procesando...
                      </span>
                    ) : (
                      <><CheckCircleIcon className="w-5 h-5 inline" /> Generar Nota de Crédito</>
                    )}
                  </button>
                  <button type="button"
                    onClick={resetForm}
                    className="px-6 py-3 border border-slate-300 dark:border-slate-600 rounded-lg font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                  >
                    Cancelar
                  </button>
                </div>

                {processStatus === 'success' && (
                  <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg">
                    {processMessage}
                  </div>
                )}

                {processStatus === 'error' && (
                  <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg">
                    {processMessage}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          /* Lista de Notas de Crédito */
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6 md:p-8">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Notas de Crédito Creadas</h2>
            
            {loadingCreditNotes ? (
              <div className="text-center py-8 text-slate-500">Cargando notas de crédito...</div>
            ) : creditNotes.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No hay notas de crédito creadas aún
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-100 dark:bg-slate-700">
                    <tr>
                      <th className="p-3 text-left text-slate-600 dark:text-slate-300">Número</th>
                      <th className="p-3 text-left text-slate-600 dark:text-slate-300">Fecha</th>
                      <th className="p-3 text-left text-slate-600 dark:text-slate-300">Factura</th>
                      <th className="p-3 text-left text-slate-600 dark:text-slate-300">Cliente</th>
                      <th className="p-3 text-left text-slate-600 dark:text-slate-300">Razón</th>
                      <th className="p-3 text-right text-slate-600 dark:text-slate-300">Monto</th>
                      <th className="p-3 text-center text-slate-600 dark:text-slate-300">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creditNotes.map((note, index) => (
                      <tr key={index} className="border-t border-slate-200 dark:border-slate-600">
                        <td className="p-3 font-medium text-slate-800 dark:text-white">{note.numero}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{note.fecha}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{note.invoiceNumber}</td>
                        <td className="p-3 text-slate-800 dark:text-white">{note.cliente}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{note.razon}</td>
                        <td className="p-3 text-right font-medium text-slate-800 dark:text-white">${note.monto.toFixed(2)}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            note.estado === 'AUTORIZADA' || note.estado === 'AUTHORIZED'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                              : note.estado.includes('DEMO')
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                          }`}>
                            {note.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
