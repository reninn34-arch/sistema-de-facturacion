import React, { useState, useEffect, useId } from 'react';
import { ArrowPathIcon, MagnifyingGlassIcon, ClockIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { Client, Product, Document, DocumentType, SriStatus, PaymentStatus, InvoiceItem, BusinessInfo } from '../../../types/types';
import { buildCreditNoteXml, authorizeWithSRI } from '../../../services/sriService';
import { SignatureOptions } from '../../../services/xmlSigner';
import { getLocalDateISO } from '../../../utils/date';

interface Props {
  clients: Client[];
  products: Product[];
  invoices: Document[];
  businessInfo: BusinessInfo;
  signatureOptions: SignatureOptions | null;
  onDocumentCreated: (doc: Document) => void;
}

const CREDIT_NOTE_REASONS = [
  { code: '01', description: 'Devolución/Anulación' },
  { code: '04', description: 'Modificación/Corrección' },
];

const CreditNoteForm: React.FC<Props> = ({
  clients,
  products,
  invoices,
  businessInfo,
  signatureOptions,
  onDocumentCreated
}) => {
  // Filtrar solo facturas autorizadas
  const authorizedInvoices = (Array.isArray(invoices) ? invoices : []).filter(inv =>
    inv.type === DocumentType.INVOICE &&
    inv.status === SriStatus.AUTHORIZED
  );

  const [selectedInvoice, setSelectedInvoice] = useState<Document | null>(null);
  const fieldId = useId();
  const [searchInvoice, setSearchInvoice] = useState('');
  const [reason, setReason] = useState('01');
  const [customReason, setCustomReason] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [additionalInfo, setAdditionalInfo] = useState('');

  // Estados de autorización
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authStatus, setAuthStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [authMessage, setAuthMessage] = useState('');
  const [authSteps, setAuthSteps] = useState<{ id: string; text: string }[]>([]);
  const [generatedXml, setGeneratedXml] = useState('');

  useEffect(() => {
    if (selectedInvoice && selectedInvoice.items) {
      // Inicializar con todos los items de la factura
      setItems(selectedInvoice.items.map(item => ({
        ...item,
        quantity: 0, // Usuario debe ingresar cantidad a devolver
      })));
    }
  }, [selectedInvoice]);

  const handleInvoiceSelect = (invoiceId: string) => {
    const invoice = authorizedInvoices.find(inv => inv.id === invoiceId);
    setSelectedInvoice(invoice || null);
  };

  const handleItemQuantityChange = (index: number, quantity: number) => {
    const newItems = [...items];
    const maxQty = selectedInvoice?.items?.[index]?.quantity || 0;
    newItems[index].quantity = Math.min(Math.max(0, quantity), maxQty);
    newItems[index].total = newItems[index].quantity * newItems[index].unitPrice - newItems[index].discount;
    setItems(newItems);
  };

  const calculateTotals = () => {
    const validItems = items.filter(item => item.quantity > 0);
    const subtotal0 = validItems.reduce((sum, item) =>
      item.taxRate === 0 ? sum + item.quantity * item.unitPrice - item.discount : sum, 0
    );
    const subtotal15 = validItems.reduce((sum, item) =>
      item.taxRate > 0 ? sum + item.quantity * item.unitPrice - item.discount : sum, 0
    );
    const iva = subtotal15 * 0.15;
    const total = subtotal0 + subtotal15 + iva;

    return { subtotal0, subtotal15, iva, total, validItems };
  };

  const handleAuthorize = async () => {
    if (!selectedInvoice) {
      alert('Debe seleccionar una factura');
      return;
    }

    const { validItems, total } = calculateTotals();

    if (validItems.length === 0) {
      alert('Debe ingresar al menos un ítem con cantidad mayor a 0');
      return;
    }

    setIsAuthorizing(true);
    setAuthStatus('processing');
    setAuthSteps([]);
    setAuthMessage('Iniciando proceso de autorización...');

    try {
      // Generar número de nota de crédito desde el backend (DB Sequence)
      const API_URL = import.meta.env.VITE_BACKEND_URL || '';
      const token = localStorage.getItem('adminToken');
      const seqResponse = await fetch(`${API_URL}/api/documents/next-sequence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: '04',
          establishmentCode: businessInfo.establishmentCode || '001',
          emissionPointCode: businessInfo.emissionPointCode || '001',
        })
      });

      if (!seqResponse.ok) {
        const err = await seqResponse.json().catch(() => ({}));
        throw new Error(err.message || 'Error obteniendo secuencial');
      }

      const seqData = await seqResponse.json();
      const creditNoteNumber = seqData.number;

      // Crear documento temporal
      const tempDoc: Document = {
        id: Date.now().toString(),
        type: DocumentType.CREDIT_NOTE,
        number: creditNoteNumber,
        accessKey: '',
        issueDate: getLocalDateISO(),
        entityName: selectedInvoice.entityName,
        entityEmail: selectedInvoice.entityEmail,
        entityPhone: selectedInvoice.entityPhone,
        total: total,
        status: SriStatus.PENDING,
        paymentStatus: PaymentStatus.PAID, // Las NC no generan pagos
        additionalInfo: customReason || additionalInfo,
        items: validItems,
        relatedDocumentNumber: selectedInvoice.number,
        relatedDocumentDate: selectedInvoice.issueDate,
        relatedDocumentAccessKey: selectedInvoice.accessKey,
        creditNoteReason: CREDIT_NOTE_REASONS.find(r => r.code === reason)?.description || customReason,
      };

      // Generar XML
      const xml = buildCreditNoteXml(tempDoc, businessInfo, validItems, reason, customReason);
      setGeneratedXml(xml);

      // Autorizar con SRI (soporta certificado local o cifrado en servidor por businessId)
      const effectiveSignatureOptions = {
        ...(signatureOptions || {}),
        businessId: businessInfo.id
      };

      const result = await authorizeWithSRI(
        xml,
        businessInfo.isProduction,
        effectiveSignatureOptions as any,
        (step) => {
          setAuthSteps(prev => [...prev, { id: crypto.randomUUID(), text: step }]);
        },
        businessInfo.isDemo || false
      );

      if (result.status === SriStatus.AUTHORIZED) {
        tempDoc.status = SriStatus.AUTHORIZED;
        tempDoc.accessKey = result.claveAcceso || '';
        onDocumentCreated(tempDoc);
        setAuthStatus('success');
        setAuthMessage(`Nota de credito autorizada. Numero de autorizacion: ${result.authNumber}`);

        // Limpiar formulario
        setTimeout(() => {
          resetForm();
        }, 3000);
      } else {
        // Guardar NC rechazada para historial
        tempDoc.status = SriStatus.REJECTED;
        tempDoc.accessKey = '';
        tempDoc.additionalInfo = `[RECHAZADA SRI] ${result.message}` + (additionalInfo ? ` | ${additionalInfo}` : '');
        onDocumentCreated(tempDoc);
        setAuthStatus('error');
        setAuthMessage(result.message || 'Error en la autorizacion');
      }
    } catch (error: any) {
      setAuthStatus('error');
      setAuthMessage(error.message || 'Error al procesar la nota de crédito');
    } finally {
      setIsAuthorizing(false);
    }
  };

  const resetForm = () => {
    setSelectedInvoice(null);
    setSearchInvoice('');
    setReason('01');
    setCustomReason('');
    setItems([]);
    setAdditionalInfo('');
    setAuthStatus('idle');
    setAuthMessage('');
    setAuthSteps([]);
    setGeneratedXml('');
  };

  const { subtotal0, subtotal15, iva, total } = calculateTotals();

  const filteredInvoices = authorizedInvoices.filter(inv =>
    inv.number.toLowerCase().includes(searchInvoice.toLowerCase()) ||
    inv.entityName.toLowerCase().includes(searchInvoice.toLowerCase()) ||
    inv.accessKey.toLowerCase().includes(searchInvoice.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-2xl shadow-sm p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <ArrowPathIcon className="w-12 h-12 text-slate-700 dark:text-slate-300" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Nota de Crédito</h2>
            <p className="text-gray-600 dark:text-slate-400">Devoluciones, anulaciones y correcciones de facturas</p>
          </div>
        </div>

        {/* Selección de Factura */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800 dark:text-white">
            <MagnifyingGlassIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            1. Seleccione la Factura a Modificar
          </h3>

          <div className="mb-4">
            <input
              type="text"
              value={searchInvoice}
              onChange={(e) => setSearchInvoice(e.target.value)}
              placeholder="Buscar por número, cliente o clave de acceso..."
              className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white dark:bg-slate-900/50 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-550"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-64 overflow-y-auto">
            {filteredInvoices.map(invoice => (
              <button
                type="button"
                key={invoice.id}
                onClick={() => handleInvoiceSelect(invoice.id)}
                aria-pressed={selectedInvoice?.id === invoice.id}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all text-left w-full ${selectedInvoice?.id === invoice.id
                  ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/20 dark:border-sky-450'
                  : 'border-gray-200 dark:border-slate-700 hover:border-sky-300 dark:hover:border-sky-500 bg-white dark:bg-slate-800/50'
                  }`}
              >
                <div className="font-semibold text-gray-800 dark:text-white">{invoice.number}</div>
                <div className="text-sm text-gray-600 dark:text-slate-400">{invoice.entityName}</div>
                <div className="text-sm text-gray-500 dark:text-slate-500">{invoice.issueDate}</div>
                <div className="text-lg font-bold text-sky-600 dark:text-sky-400 mt-2">
                  ${invoice.total.toFixed(2)}
                </div>
              </button>
            ))}
          </div>

          {authorizedInvoices.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-slate-400">
              No hay facturas autorizadas disponibles para crear notas de crédito
            </div>
          )}
        </div>

        {selectedInvoice && (
          <>
            {/* Motivo */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">2. Motivo de la Nota de Crédito</h3>
              <select
                aria-label="Motivo de la nota de crédito"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 mb-3 bg-white dark:bg-slate-900/50 text-gray-800 dark:text-white"
              >
                {(Array.isArray(CREDIT_NOTE_REASONS) ? CREDIT_NOTE_REASONS : []).map(r => (
                  <option key={r.code} value={r.code} className="dark:bg-slate-800 text-gray-800 dark:text-white">
                    {r.code} - {r.description}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Descripción adicional del motivo (opcional)"
                className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white dark:bg-slate-900/50 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-550"
              />
            </div>

            {/* Items */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">3. Seleccione los Items a Devolver/Modificar</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-slate-900/40">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-slate-300">Descripción</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-slate-300">Cant. Factura</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 dark:text-slate-300">Cant. NC</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-slate-300">P. Unit.</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-slate-300">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                    {items.map((item, index) => {
                      const originalItem = selectedInvoice.items?.[index];
                      const subtotal = item.quantity * item.unitPrice - item.discount;
                      return (
                        <tr key={item.productId} className="hover:bg-gray-50/50 dark:hover:bg-slate-900/10">
                          <td className="px-4 py-3 text-sm text-gray-800 dark:text-slate-200">{item.description}</td>
                          <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-slate-400">
                            {originalItem?.quantity || 0}
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              aria-label="Cantidad a devolver"
                              min="0"
                              max={originalItem?.quantity || 0}
                              value={item.quantity}
                              onChange={(e) => handleItemQuantityChange(index, parseFloat(e.target.value) || 0)}
                              className="w-20 p-2 border border-gray-300 dark:border-slate-600 rounded text-center focus:ring-2 focus:ring-sky-500 bg-white dark:bg-slate-900/50 text-gray-800 dark:text-white"
                            />
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-800 dark:text-slate-200">
                            ${item.unitPrice.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-gray-800 dark:text-white">
                            ${subtotal.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totales */}
            <div className="bg-gray-50 dark:bg-slate-900/30 border border-gray-100 dark:border-slate-700/50 rounded-xl p-6 mb-6">
              <div className="max-w-md ml-auto space-y-2">
                <div className="flex justify-between text-gray-700 dark:text-slate-300">
                  <span>Subtotal 0%:</span>
                  <span className="font-semibold text-gray-800 dark:text-white">${subtotal0.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700 dark:text-slate-300">
                  <span>Subtotal 15%:</span>
                  <span className="font-semibold text-gray-800 dark:text-white">${subtotal15.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700 dark:text-slate-300">
                  <span>IVA 15%:</span>
                  <span className="font-semibold text-gray-800 dark:text-white">${iva.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-sky-600 dark:text-sky-400 pt-2 border-t-2 border-sky-200 dark:border-sky-950">
                  <span>TOTAL A DEVOLVER:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Información Adicional */}
            <div className="mb-6">
              <label htmlFor={`${fieldId}-additionalInfo`} className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Información Adicional (Opcional)
              </label>
              <textarea
                id={`${fieldId}-additionalInfo`}
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                rows={3}
                className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white dark:bg-slate-900/50 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-550"
                placeholder="Observaciones adicionales..."
              />
            </div>

            {/* Botón Autorizar */}
            <div className="flex gap-4">
              <button type="button"
                onClick={handleAuthorize}
                disabled={isAuthorizing || items.filter(i => i.quantity > 0).length === 0}
                className="flex-1 bg-sky-600 hover:bg-sky-700 disabled:bg-gray-400 dark:disabled:bg-slate-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isAuthorizing ? (
                  <>
                    <ClockIcon className="w-5 h-5 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-5 h-5" />
                    Autorizar Nota de Crédito con SRI
                  </>
                )}
              </button>

              <button type="button"
                onClick={resetForm}
                disabled={isAuthorizing}
                className="px-6 py-3 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>

      {/* Panel de Autorización */}
      {authStatus !== 'idle' && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Estado de Autorización</h3>

          <div className="space-y-2 mb-4">
            {authSteps.map((step) => (
              <div key={step.id} className="flex items-start gap-2 text-sm text-gray-700 dark:text-slate-300">
                <span className="text-sky-600 dark:text-sky-400">▸</span>
                <span>{step.text}</span>
              </div>
            ))}
          </div>

          {authStatus === 'success' && (
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/30 rounded-lg p-4 flex items-start gap-3">
              <CheckCircleIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
              <div>
                <div className="font-semibold text-green-800 dark:text-green-300">¡Nota de Crédito Autorizada!</div>
                <div className="text-sm text-green-700 dark:text-green-400/80 mt-1">{authMessage}</div>
              </div>
            </div>
          )}

          {authStatus === 'error' && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 rounded-lg p-4 flex items-start gap-3">
              <XCircleIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
              <div>
                <div className="font-semibold text-red-800 dark:text-red-300">Error en Autorización</div>
                <div className="text-sm text-red-700 dark:text-red-400/80 mt-1">{authMessage}</div>
              </div>
            </div>
          )}

          {generatedXml && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-semibold text-gray-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400">
                Ver XML Generado
              </summary>
              <pre className="mt-2 p-4 bg-gray-50 dark:bg-slate-900/60 rounded-lg text-xs overflow-x-auto text-gray-800 dark:text-slate-350 border border-gray-100 dark:border-slate-800">
                {generatedXml}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
};

export default CreditNoteForm;
