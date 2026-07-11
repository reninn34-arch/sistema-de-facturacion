import React, { useState, useMemo } from 'react';
import { Client, Document, InvoiceItem, DocumentType, SriStatus, PaymentStatus, BusinessInfo } from '../../../types/types';
import { getLocalDateISO } from '../../../utils/date';
import { DocumentTextIcon, TrashIcon, PlusIcon, ArrowDownTrayIcon, BuildingOffice2Icon, CubeIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';

interface PurchaseManagerProps {
  clients: Client[];
  businessInfo: BusinessInfo;
  purchases: Document[];
  onNotify: (msg: string, type?: any) => void;
  onPurchaseAdded: (doc: Document) => void;
  onPurchaseDeleted: (id: string) => void;
  isDemoMode: boolean;
}

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

const PurchaseManager: React.FC<PurchaseManagerProps> = ({ clients, businessInfo, purchases, onNotify, onPurchaseAdded, onPurchaseDeleted, isDemoMode }) => {
  const [showForm, setShowForm] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Client | null>(null);
  const [manualSupplier, setManualSupplier] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [supplierRuc, setSupplierRuc] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [docDate, setDocDate] = useState(new Date().toISOString().split('T')[0]);
  const [accessKey, setAccessKey] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(false);

  const providers = useMemo(() =>
    (Array.isArray(clients) ? clients : []).filter(c => c.type === 'PROVEEDOR' || c.type === 'AMBOS'),
  [clients]);

  const filteredProviders = useMemo(() =>
    providers.filter(p => p.name.toLowerCase().includes(supplierSearch.toLowerCase()) || p.ruc.includes(supplierSearch)),
  [providers, supplierSearch]);

  const resetForm = () => {
    setShowForm(false);
    setSupplierSearch('');
    setSelectedSupplier(null);
    setManualSupplier(false);
    setSupplierName('');
    setSupplierRuc('');
    setDocNumber('');
    setDocDate(new Date().toISOString().split('T')[0]);
    setAccessKey('');
    setItems([]);
  };

  const addItem = () => {
    setItems([...items, {
      productId: `temp-${Date.now()}`,
      description: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      taxRate: 15,
      total: 0,
      type: 'FISICO'
    } as InvoiceItem]);
  };

  const updateItem = (idx: number, field: string, value: any) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      updated.total = Math.max(0, (updated.quantity * updated.unitPrice) - (updated.discount || 0));
      return updated;
    }));
  };

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const totals = useMemo(() => {
    const sub15 = items.filter(i => i.taxRate > 0).reduce((s, i) => s + (i.quantity * i.unitPrice - (i.discount || 0)), 0);
    const sub0 = items.filter(i => i.taxRate === 0).reduce((s, i) => s + (i.quantity * i.unitPrice - (i.discount || 0)), 0);
    const iva = items.filter(i => i.taxRate > 0).reduce((s, i) => s + ((i.quantity * i.unitPrice - (i.discount || 0)) * (i.taxRate / 100)), 0);
    const desc = items.reduce((s, i) => s + (i.discount || 0), 0);
    const total = sub15 + sub0 + iva;
    return { sub15, sub0, iva, desc, total };
  }, [items]);

  const handleSave = async () => {
    const entityName = manualSupplier ? supplierName : (selectedSupplier?.name || '');
    const entityRuc = manualSupplier ? supplierRuc : (selectedSupplier?.ruc || '');

    if (!entityName || !entityRuc) {
      onNotify('Ingrese los datos del proveedor', 'error');
      return;
    }
    if (!docNumber) {
      onNotify('Ingrese el numero del comprobante', 'error');
      return;
    }
    if (items.length === 0) {
      onNotify('Agregue al menos un item', 'error');
      return;
    }

    const doc: Document = {
      id: Math.random().toString(36).substr(2, 9),
      type: DocumentType.INVOICE,
      number: docNumber,
      issueDate: docDate,
      entityName,
      entityRuc,
      entityEmail: selectedSupplier?.email || '',
      entityPhone: selectedSupplier?.phone || '',
      entityAddress: selectedSupplier?.address || '',
      total: totals.total,
      status: SriStatus.AUTHORIZED,
      paymentStatus: PaymentStatus.PENDING,
      paymentMethod: '01',
      items: [...items],
      source: 'RECEIVED',
      accessKey: accessKey || undefined
    } as Document;

    if (isDemoMode) {
      onPurchaseAdded(doc);
      onNotify('Comprobante de compra registrado (Modo Demo)');
      resetForm();
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_URL}/api/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          type: '01',
          number: docNumber,
          issueDate: docDate,
          entityName,
          entityRuc,
          total: totals.total,
          status: 'AUTORIZADO',
          paymentStatus: 'PENDIENTE',
          source: 'RECEIVED',
          accessKey: accessKey || null,
          items: items.map(it => ({
            description: it.description,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            discount: it.discount || 0,
            taxRate: it.taxRate,
            total: it.total
          }))
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Error al guardar');
      }

      const saved = await response.json();
      onPurchaseAdded(saved);
      onNotify('Comprobante de compra registrado');
      resetForm();
    } catch (err: any) {
      onNotify(err.message || 'Error de conexion', 'error');
    } finally {
      setLoading(false);
    }
  };

  const safePurchases = Array.isArray(purchases) ? purchases.filter(d => (d as any).source === 'RECEIVED') : [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight">Comprobantes Recibidos</h3>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Registre facturas y comprobantes de sus proveedores</p>
        </div>
        <button type="button" onClick={() => setShowForm(true)} className="bg-sky-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 transition-all flex items-center gap-2">
          <PlusIcon className="w-4 h-4" />
          Nuevo Comprobante
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Comprobantes</p>
          <p className="text-3xl font-black text-slate-800">{safePurchases.length}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total en Compras</p>
          <p className="text-3xl font-black text-amber-500">${safePurchases.reduce((s, d) => s + (d.total || 0), 0).toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">IVA en Compras</p>
          <p className="text-3xl font-black text-sky-500">${safePurchases.reduce((s, d) => {
            return s + (d.items || []).reduce((si, it) => si + ((it.quantity * it.unitPrice - (it.discount || 0)) * (it.taxRate / 100)), 0);
          }, 0).toFixed(2)}</p>
        </div>
      </div>

      {safePurchases.length > 0 && (
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400">
                <tr>
                  <th className="py-5 px-6 text-left">Nro Comprobante</th>
                  <th className="py-5 text-left">Proveedor</th>
                  <th className="py-5 text-left">RUC</th>
                  <th className="py-5 text-right">Base 12%</th>
                  <th className="py-5 text-right">IVA</th>
                  <th className="py-5 text-right">Total</th>
                  <th className="py-5 px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {safePurchases.map(doc => {
                  const base12 = (doc.items || []).filter(i => i.taxRate > 0).reduce((s, i) => s + (i.quantity * i.unitPrice - (i.discount || 0)), 0);
                  const ivaCompra = (doc.items || []).filter(i => i.taxRate > 0).reduce((s, i) => s + ((i.quantity * i.unitPrice - (i.discount || 0)) * (i.taxRate / 100)), 0);
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/50">
                      <td className="py-4 px-6">
                        <p className="text-xs font-black text-slate-800">{doc.number}</p>
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">{doc.issueDate}</p>
                      </td>
                      <td className="py-4 text-sm font-bold text-slate-600">{doc.entityName}</td>
                      <td className="py-4 text-xs text-slate-500 font-mono">{doc.entityRuc}</td>
                      <td className="py-4 text-right text-sm font-bold text-slate-700">${base12.toFixed(2)}</td>
                      <td className="py-4 text-right text-sm font-bold text-sky-500">${ivaCompra.toFixed(2)}</td>
                      <td className="py-4 text-right text-sm font-black text-slate-800">${(doc.total || 0).toFixed(2)}</td>
                      <td className="py-4 px-6 text-right">
                        <button type="submit"
                          onClick={() => {
                            if (confirm('Eliminar este comprobante?')) {
                              onPurchaseDeleted(doc.id);
                            }
                          }}
                          className="px-3 py-2 bg-rose-50 text-rose-500 hover:bg-rose-100 rounded-lg text-[9px] font-black uppercase transition-all"
                        >
                          <TrashIcon className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[400] flex items-start justify-center p-4 pt-12 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h2 className="text-xl font-extrabold text-slate-900">Nuevo Comprobante de Compra</h2>
              <button type="button" onClick={resetForm} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 font-bold">✕</button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center gap-3 mb-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-600">
                  <input type="checkbox" checked={manualSupplier} onChange={(e) => setManualSupplier(e.target.checked)} className="rounded" />
                  Ingresar proveedor manualmente
                </label>
              </div>

              {manualSupplier ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre Proveedor</label>
                    <input value={supplierName} onChange={e => setSupplierName(e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl font-bold outline-none border-2 border-transparent focus:border-sky-500" placeholder="Nombre del proveedor" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">RUC Proveedor</label>
                    <input value={supplierRuc} onChange={e => setSupplierRuc(e.target.value.replace(/\D/g, '').slice(0, 13))} className="w-full p-3 bg-slate-50 rounded-xl font-bold outline-none border-2 border-transparent focus:border-sky-500 font-mono" placeholder="1790012345001" maxLength={13} />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Buscar Proveedor</label>
                  <input
                    value={supplierSearch}
                    onChange={e => setSupplierSearch(e.target.value)}
                    className="w-full p-3 bg-slate-50 rounded-xl font-bold outline-none border-2 border-transparent focus:border-sky-500 mb-2"
                    placeholder="Nombre o RUC del proveedor..."
                  />
                  {supplierSearch && (
                    <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl">
                      {filteredProviders.length === 0 ? (
                        <p className="p-4 text-sm text-slate-400 text-center">No se encontraron proveedores</p>
                      ) : (
                        filteredProviders.slice(0, 10).map(p => (
                          <button type="button"
                            key={p.id}
                            onClick={() => { setSelectedSupplier(p); setSupplierSearch(p.name); }}
                            className="w-full text-left p-3 hover:bg-sky-50 text-sm font-bold text-slate-700 border-b border-slate-100 last:border-0 flex justify-between"
                          >
                            <span>{p.name}</span>
                            <span className="text-slate-400 font-mono text-xs">{p.ruc}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                  {selectedSupplier && (
                    <div className="mt-2 bg-sky-50 p-3 rounded-xl text-sm font-bold text-sky-700 flex items-center gap-2">
                      <BuildingOffice2Icon className="w-4 h-4" />
                      {selectedSupplier.name} ({selectedSupplier.ruc})
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nro Comprobante</label>
                  <input value={docNumber} onChange={e => setDocNumber(e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl font-bold outline-none border-2 border-transparent focus:border-sky-500" placeholder="001-001-0000001" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</label>
                  <input type="date" value={docDate} onChange={e => setDocDate(e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl font-bold outline-none border-2 border-transparent focus:border-sky-500" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Clave Acceso (opcional)</label>
                  <input value={accessKey} onChange={e => setAccessKey(e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl font-mono text-xs outline-none border-2 border-transparent focus:border-sky-500" placeholder="49 dígitos" />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Items del Comprobante</label>
                  <button type="button" onClick={addItem} className="text-xs font-bold text-sky-500 hover:text-sky-600 flex items-center gap-1">
                    <PlusIcon className="w-3 h-3" /> Agregar Item
                  </button>
                </div>

                {items.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-2xl text-slate-400">
                    <ShoppingCartIcon className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-bold">Sin items</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center bg-slate-50 p-3 rounded-xl">
                        <input
                          value={item.description}
                          onChange={e => updateItem(idx, 'description', e.target.value)}
                          className="flex-1 p-2 bg-white rounded-lg text-sm font-bold outline-none focus:ring-1 focus:ring-sky-500"
                          placeholder="Descripcion"
                        />
                        <input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))} className="w-16 p-2 bg-white rounded-lg text-center text-sm font-bold" min="1" />
                        <input type="number" step="0.01" value={item.unitPrice} onChange={e => updateItem(idx, 'unitPrice', Math.max(0, parseFloat(e.target.value) || 0))} className="w-24 p-2 bg-white rounded-lg text-right text-sm font-bold" placeholder="0.00" />
                        <select value={item.taxRate} onChange={e => updateItem(idx, 'taxRate', parseInt(e.target.value))} className="w-20 p-2 bg-white rounded-lg text-xs font-bold">
                          <option value={15}>IVA 15%</option>
                          <option value={0}>IVA 0%</option>
                        </select>
                        <span className="text-xs font-black text-sky-500 w-20 text-right">${item.total.toFixed(2)}</span>
                        <button type="button" aria-label="Acción" onClick={() => removeItem(idx)} className="text-slate-400 hover:text-rose-500 p-1">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {items.length > 0 && (
                <div className="bg-slate-50 rounded-2xl p-4 flex justify-between items-center">
                  <div className="text-xs space-y-1">
                    <p className="text-slate-500">Base 12%: <strong className="text-slate-700">${totals.sub15.toFixed(2)}</strong></p>
                    <p className="text-slate-500">Base 0%: <strong className="text-slate-700">${totals.sub0.toFixed(2)}</strong></p>
                    <p className="text-sky-500">IVA: <strong>${totals.iva.toFixed(2)}</strong></p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black text-slate-800">${totals.total.toFixed(2)}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Total Comprobante</p>
                  </div>
                </div>
              )}

              <button type="button"
                onClick={handleSave}
                disabled={loading || items.length === 0}
                className="w-full py-4 bg-sky-500 text-white font-black rounded-2xl hover:bg-sky-600 transition-all disabled:opacity-50 text-sm uppercase tracking-wider"
              >
                {loading ? 'Guardando...' : 'Registrar Comprobante de Compra'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseManager;
