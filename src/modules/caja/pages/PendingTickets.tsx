import React, { useState, useEffect, useMemo } from 'react';
import { Product, BusinessInfo, InvoiceItem, SriStatus, DocumentType, Document, PaymentStatus } from '../../../types/types';
import { generateAccessKey } from '../../../utils/sri';
import { buildInvoiceXml, authorizeWithSRI } from '../../../services/sriService';
import { getLocalDateISO } from '../../../utils/date';
import { ClipboardDocumentCheckIcon, ArrowPathIcon, EnvelopeIcon, DocumentArrowUpIcon, QueueListIcon } from '@heroicons/react/24/outline';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

interface QuickSaleTicket {
  id: string;
  sequential: number;
  number?: string;
  items: { productId: string; description: string; qty: number; unitPrice: number; total: number }[];
  subtotal: number;
  iva: number;
  total: number;
  paymentMethod: string;
  status: string;
  batchId?: string;
  documentId?: string;
  notes?: string;
  createdAt?: string;
}

interface PendingTicketsProps {
  tickets: QuickSaleTicket[];
  setTickets: (tickets: QuickSaleTicket[]) => void;
  products: Product[];
  businessInfo: BusinessInfo;
  signatureFile: File | null;
  signaturePassword: string;
  onNotify: (msg: string, type?: any) => void;
  onAuthorize: (doc: Document, items: InvoiceItem[]) => void;
}

const PendingTickets: React.FC<PendingTicketsProps> = ({
  tickets, setTickets, products, businessInfo,
  signatureFile, signaturePassword, onNotify, onAuthorize
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [processLog, setProcessLog] = useState<string[]>([]);
  const [emissionMode, setEmissionMode] = useState<'individual' | 'grouped'>('individual');
  const [loadingTickets, setLoadingTickets] = useState(false);

  // Cargar tickets desde el backend
  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    setLoadingTickets(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/api/quicksales`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
      }
    } catch {
      // Silencioso: usar tickets en estado local
    } finally {
      setLoadingTickets(false);
    }
  };

  const pendingTickets = useMemo(() =>
    tickets.filter(t => t.status === 'PENDIENTE'),
    [tickets]
  );

  const selectedTickets = useMemo(() =>
    pendingTickets.filter(t => selectedIds.has(t.id)),
    [pendingTickets, selectedIds]
  );

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === pendingTickets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingTickets.map(t => t.id)));
    }
  };

  const selectedTotal = selectedTickets.reduce((sum, t) => sum + t.total, 0);

  // Enviar un ticket individual al SRI como factura
  const sendIndividualToSRI = async (ticket: QuickSaleTicket): Promise<boolean> => {
    const items: InvoiceItem[] = ticket.items.map(item => ({
      productId: item.productId,
      description: item.description,
      quantity: item.qty,
      unitPrice: item.unitPrice,
      discount: 0,
      taxRate: products.find(p => p.id === item.productId)?.taxRate || 15,
      total: item.total,
      type: 'FISICO' as const,
    }));

    const sequential = Math.floor(Math.random() * 999999999).toString().padStart(9, '0');
    const numericCode = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    const now = new Date();
    const dateFormatted = `${String(now.getDate()).padStart(2,'0')}${String(now.getMonth()+1).padStart(2,'0')}${now.getFullYear()}`;

    const accessKey = generateAccessKey(
      dateFormatted, '01', businessInfo.ruc,
      businessInfo.isProduction ? '2' : '1',
      businessInfo.establishmentCode, businessInfo.emissionPointCode,
      sequential, numericCode, '1'
    );

    const doc: Document = {
      id: crypto.randomUUID(),
      type: DocumentType.INVOICE,
      number: `${businessInfo.establishmentCode}-${businessInfo.emissionPointCode}-${sequential}`,
      accessKey,
      issueDate: getLocalDateISO(),
      entityName: 'CONSUMIDOR FINAL',
      entityRuc: '9999999999999',
      total: ticket.total,
      status: SriStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      paymentMethod: ticket.paymentMethod === 'EFECTIVO' ? '01' : ticket.paymentMethod === 'TARJETA' ? '19' : '20',
      items,
    };

    const xml = buildInvoiceXml(doc, businessInfo, items);

    const signatureOptions = signatureFile && signaturePassword ? {
      p12File: signatureFile,
      password: signaturePassword,
      claveAcceso: accessKey
    } : null;

    const log = (msg: string) => setProcessLog(prev => [...prev, `[${ticket.number || String(ticket.sequential).slice(-6)}] ${msg}`]);
    const isDemo = (businessInfo as any).isDemo || false;

    const result = await authorizeWithSRI(xml, businessInfo.isProduction, signatureOptions, log, isDemo);

    if (result.status === SriStatus.AUTHORIZED) {
      const authorizedDoc = { ...doc, status: SriStatus.AUTHORIZED, accessKey: result.claveAcceso || accessKey };
      onAuthorize(authorizedDoc, items);
      setTickets(tickets.map(t => t.id === ticket.id ? { ...t, status: 'ENVIADO_SRI', documentId: authorizedDoc.id } : t));
      return true;
    } else {
      onNotify(`Ticket ${ticket.number || String(ticket.sequential).slice(-6)}: ${result.message}`, 'error');
      return false;
    }
  };

  // Agrupar tickets seleccionados en una sola factura
  const sendGroupedToSRI = async () => {
    if (selectedTickets.length === 0) {
      onNotify('Seleccione al menos un ticket', 'error');
      return;
    }

    setIsProcessing(true);
    setProcessLog([]);

    try {
      // Combinar todos los items de los tickets seleccionados
      const allItems: { productId: string; description: string; quantity: number; unitPrice: number; total: number }[] = [];
      selectedTickets.forEach(ticket => {
        ticket.items.forEach(item => {
          const existing = allItems.find(i => i.productId === item.productId && i.unitPrice === item.unitPrice);
          if (existing) {
            existing.quantity += item.qty;
            existing.total += item.total;
          } else {
            allItems.push({ ...item, quantity: item.qty });
          }
        });
      });

      const invoiceItems: InvoiceItem[] = allItems.map(item => ({
        productId: item.productId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: 0,
        taxRate: products.find(p => p.id === item.productId)?.taxRate || 15,
        total: item.total,
        type: 'FISICO' as const,
      }));

      const sequential = Math.floor(Math.random() * 999999999).toString().padStart(9, '0');
      const numericCode = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
      const now = new Date();
      const dateFormatted = `${String(now.getDate()).padStart(2,'0')}${String(now.getMonth()+1).padStart(2,'0')}${now.getFullYear()}`;

      const accessKey = generateAccessKey(
        dateFormatted, '01', businessInfo.ruc,
        businessInfo.isProduction ? '2' : '1',
        businessInfo.establishmentCode, businessInfo.emissionPointCode,
        sequential, numericCode, '1'
      );

      const totalGrouped = selectedTickets.reduce((s, t) => s + t.total, 0);

      const doc: Document = {
        id: crypto.randomUUID(),
        type: DocumentType.INVOICE,
        number: `${businessInfo.establishmentCode}-${businessInfo.emissionPointCode}-${sequential}`,
        accessKey,
        issueDate: getLocalDateISO(),
        entityName: 'CONSUMIDOR FINAL',
        entityRuc: '9999999999999',
        total: totalGrouped,
        status: SriStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        paymentMethod: '01',
        items: invoiceItems,
        additionalInfo: `Agrupa ${selectedTickets.length} tickets: ${selectedTickets.map(t => t.number || t.sequential.slice(-6)).join(', ')}`,
      };

      const xml = buildInvoiceXml(doc, businessInfo, invoiceItems);

      const signatureOptions = signatureFile && signaturePassword ? {
        p12File: signatureFile,
        password: signaturePassword,
        claveAcceso: accessKey
      } : null;

      const log = (msg: string) => setProcessLog(prev => [...prev, `[LOTE] ${msg}`]);
      const isDemo = (businessInfo as any).isDemo || false;

      const result = await authorizeWithSRI(xml, businessInfo.isProduction, signatureOptions, log, isDemo);

      if (result.status === SriStatus.AUTHORIZED) {
        const authorizedDoc = { ...doc, status: SriStatus.AUTHORIZED, accessKey: result.claveAcceso || accessKey };
        onAuthorize(authorizedDoc, invoiceItems);

        const batchId = crypto.randomUUID();
        setTickets(tickets.map(t =>
          selectedIds.has(t.id)
            ? { ...t, status: 'ENVIADO_SRI', batchId, documentId: authorizedDoc.id }
            : t
        ));
        setSelectedIds(new Set());
        onNotify(`Lote de ${selectedTickets.length} tickets enviado al SRI. Factura: ${doc.number}`);
      } else {
        onNotify(`Error al enviar lote: ${result.message}`, 'error');
      }
    } catch (error) {
      onNotify('Error procesando el lote de tickets', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Procesar selección individual (uno por uno)
  const processIndividual = async () => {
    if (selectedTickets.length === 0) {
      onNotify('Seleccione al menos un ticket', 'error');
      return;
    }

    setIsProcessing(true);
    setProcessLog([]);

    let success = 0, failed = 0;
    for (const ticket of selectedTickets) {
      const ok = await sendIndividualToSRI(ticket);
      if (ok) success++; else failed++;
    }

    onNotify(`Procesados: ${success} exitosos, ${failed} fallidos`);
    setIsProcessing(false);
    setSelectedIds(new Set());
  };

  const handleProcess = () => {
    if (emissionMode === 'individual') {
      processIndividual();
    } else {
      sendGroupedToSRI();
    }
  };

  const sentCount = tickets.filter(t => t.status === 'ENVIADO_SRI').length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-3">
            <ClipboardDocumentCheckIcon className="w-8 h-8 text-amber-500" />
            Pendientes SRI
          </h2>
          <p className="text-sm text-slate-400 font-bold mt-1">
            Tickets pendientes de envío al SRI · {pendingTickets.length} pendientes · {sentCount} enviados
          </p>
        </div>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3">
            <select
              value={emissionMode}
              onChange={e => setEmissionMode(e.target.value as 'individual' | 'grouped')}
              className="p-3 rounded-2xl font-bold text-xs bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 outline-none"
            >
              <option value="individual">Factura individual por ticket</option>
              <option value="grouped">Agrupar en una sola factura (Consumidor Final)</option>
            </select>
            <button
              onClick={handleProcess}
              disabled={isProcessing}
              className="px-6 py-3 rounded-2xl font-black text-xs uppercase bg-amber-600 text-white hover:bg-amber-500 disabled:bg-slate-300 shadow-lg transition-colors flex items-center gap-2"
            >
              {isProcessing ? (
                <><ArrowPathIcon className="w-4 h-4 animate-spin" /> Procesando...</>
              ) : (
                <><DocumentArrowUpIcon className="w-4 h-4" /> Enviar al SRI ({selectedIds.size})</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Info de modo de emisión */}
      <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4">
        <p className="text-xs text-amber-700 dark:text-amber-300 font-bold">
          {emissionMode === 'individual'
            ? 'Modo individual: Cada ticket se convertirá en una factura electrónica independiente para Consumidor Final (RUC 9999999999999).'
            : 'Modo agrupado: Todos los tickets seleccionados se combinarán en una sola factura electrónica para Consumidor Final, sumando cantidades por producto.'}
        </p>
      </div>

      {/* Logs de proceso */}
      {processLog.length > 0 && (
        <div className="bg-slate-900 dark:bg-slate-950 rounded-2xl p-4 font-mono text-xs text-emerald-400 max-h-48 overflow-y-auto">
          {processLog.map((line, i) => (
            <div key={i} className="py-0.5">{line}</div>
          ))}
        </div>
      )}

      {/* Tabla de tickets pendientes */}
      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        {loadingTickets ? (
          <div className="p-12 text-center">
            <ArrowPathIcon className="w-8 h-8 animate-spin text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-400 font-bold">Cargando tickets...</p>
          </div>
        ) : pendingTickets.length === 0 ? (
          <div className="p-16 text-center">
            <QueueListIcon className="w-16 h-16 text-slate-200 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Sin tickets pendientes</h3>
            <p className="text-sm text-slate-300 mt-2">Genere tickets desde el módulo de Caja para enviarlos al SRI</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <th className="text-left p-4 w-12">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === pendingTickets.length && pendingTickets.length > 0}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded accent-amber-600"
                  />
                </th>
                <th className="text-left p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ticket</th>
                <th className="text-left p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                <th className="text-left p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Items</th>
                <th className="text-right p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Subtotal</th>
                <th className="text-right p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">IVA</th>
                <th className="text-right p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</th>
                <th className="text-center p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pago</th>
                <th className="text-center p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
              </tr>
            </thead>
            <tbody>
              {pendingTickets.map(ticket => (
                <tr
                  key={ticket.id}
                  className={`border-b border-slate-50 dark:border-slate-700/50 transition-colors ${
                    selectedIds.has(ticket.id) ? 'bg-amber-50 dark:bg-amber-500/5' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                  }`}
                >
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(ticket.id)}
                      onChange={() => toggleSelect(ticket.id)}
                      className="w-4 h-4 rounded accent-amber-600"
                    />
                  </td>
                  <td className="p-4 font-bold text-sm">
                    {ticket.number || `#${String(ticket.sequential).slice(-8)}`}
                  </td>
                  <td className="p-4 text-xs text-slate-500">
                    {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString('es-EC') : '-'}
                  </td>
                  <td className="p-4 text-xs">
                    {ticket.items?.length || 0} producto(s)
                  </td>
                  <td className="p-4 text-right text-xs font-bold">
                    ${ticket.subtotal.toFixed(2)}
                  </td>
                  <td className="p-4 text-right text-xs">
                    ${ticket.iva.toFixed(2)}
                  </td>
                  <td className="p-4 text-right font-black text-sm">
                    ${ticket.total.toFixed(2)}
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-lg">
                      {ticket.paymentMethod === 'EFECTIVO' ? 'Efectivo' :
                       ticket.paymentMethod === 'TARJETA' ? 'Tarjeta' : 'Transf.'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 px-3 py-1 rounded-xl">
                      PENDIENTE
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Resumen de selección */}
      {selectedIds.size > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-black text-slate-800 dark:text-white text-lg">
                {selectedIds.size} ticket(s) seleccionado(s)
              </p>
              <p className="text-xs text-slate-400 font-bold">
                Modo: {emissionMode === 'individual' ? 'Facturas individuales' : 'Factura agrupada (Consumidor Final)'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase">Total a facturar</p>
              <p className="text-2xl font-black text-sky-500 dark:text-sky-400">${selectedTotal.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tickets ya enviados (historial) */}
      {sentCount > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border-b border-emerald-100 dark:border-emerald-500/20">
            <h3 className="font-black text-emerald-700 dark:text-emerald-400 uppercase text-sm flex items-center gap-2">
              <EnvelopeIcon className="w-4 h-4" />
              Enviados al SRI ({sentCount})
            </h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <th className="text-left p-3 text-[10px] font-black text-slate-400 uppercase">Ticket</th>
                <th className="text-right p-3 text-[10px] font-black text-slate-400 uppercase">Total</th>
                <th className="text-center p-3 text-[10px] font-black text-slate-400 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody>
              {tickets.filter(t => t.status === 'ENVIADO_SRI').slice(0, 20).map(ticket => (
                <tr key={ticket.id} className="border-b border-slate-50 dark:border-slate-700/50">
                  <td className="p-3 text-xs font-bold">{ticket.number || `#${String(ticket.sequential).slice(-8)}`}</td>
                  <td className="p-3 text-right text-xs font-bold">${ticket.total.toFixed(2)}</td>
                  <td className="p-3 text-center">
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 px-3 py-1 rounded-xl">
                      ENVIADO
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PendingTickets;
