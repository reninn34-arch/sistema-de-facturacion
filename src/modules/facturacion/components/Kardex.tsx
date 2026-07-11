import React, { useState, useMemo } from 'react';
import { CubeIcon, ArrowDownTrayIcon, InboxIcon } from '@heroicons/react/24/outline';
import { Product, Document, InventoryMovement } from '../../../types/types';

interface KardexProps {
  products: Product[];
  documents: Document[];
  onNotify: (message: string, type?: 'success' | 'info' | 'warning') => void;
}

export default function Kardex({ products, documents, onNotify }: KardexProps) {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const safeProducts = Array.isArray(products) ? products : [];
  const safeDocuments = Array.isArray(documents) ? documents : [];

  const selectedProduct = safeProducts.find(p => p.id === selectedProductId);

  const movements = useMemo((): InventoryMovement[] => {
    if (!selectedProductId) return [];

    const productMovements: InventoryMovement[] = [];
    let balance = 0;

    // Filtrar documentos autorizados con el producto
    const relevantDocs = documents
      .filter(doc => {
        if (doc.status !== 'AUTORIZADA') return false;
        const docDate = new Date(doc.issueDate);
        if (startDate && docDate < new Date(startDate)) return false;
        if (endDate && docDate > new Date(endDate)) return false;
        return doc.items?.some(item => item.productId === selectedProductId);
      })
      .sort((a, b) => new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime());

    relevantDocs.forEach(doc => {
      const item = doc.items?.find(i => i.productId === selectedProductId);
      if (!item) return;

      const isOutbound = doc.type === '01'; // Factura = salida
      const quantity = item.quantity;
      const unitCost = item.unitPrice;

      if (isOutbound) {
        balance -= quantity;
        productMovements.push({
          date: doc.issueDate,
          documentType: 'FACTURA',
          documentNumber: doc.number,
          description: `Venta a ${doc.entityName}`,
          quantityIn: 0,
          quantityOut: quantity,
          balance,
          unitCost,
          totalCost: unitCost * balance
        });
      } else {
        balance += quantity;
        productMovements.push({
          date: doc.issueDate,
          documentType: 'COMPRA',
          documentNumber: doc.number,
          description: `Compra`,
          quantityIn: quantity,
          quantityOut: 0,
          balance,
          unitCost,
          totalCost: unitCost * balance
        });
      }
    });

    return productMovements;
  }, [selectedProductId, documents, startDate, endDate]);

  const exportToCSV = () => {
    if (!selectedProduct) {
      onNotify('Selecciona un producto', 'warning');
      return;
    }

    let csv = `KARDEX DE INVENTARIO\nProducto: ${selectedProduct.description}\nCódigo: ${selectedProduct.code}\n\n`;
    csv += 'Fecha,Tipo,Número,Descripción,Entradas,Salidas,Saldo,Costo Unit.,Costo Total\n';

    movements.forEach(mov => {
      csv += `${mov.date},${mov.documentType},${mov.documentNumber},"${mov.description}",${mov.quantityIn},${mov.quantityOut},${mov.balance},${mov.unitCost.toFixed(2)},${mov.totalCost.toFixed(2)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `kardex_${selectedProduct.code}_${startDate}_${endDate}.csv`;
    link.click();

    onNotify('Kardex exportado exitosamente');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/50 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <CubeIcon className="w-10 h-10 text-slate-700 dark:text-slate-300" />
            <div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Kardex de Inventario</h2>
              <p className="text-sm text-slate-505 dark:text-slate-450 font-bold">Control de movimientos por producto</p>
            </div>
          </div>
          <button
            onClick={exportToCSV}
            disabled={movements.length === 0}
            className="px-6 py-3 bg-sky-500 text-white rounded-xl font-bold text-sm hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowDownTrayIcon className="w-4 h-4 inline" /> Exportar CSV
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Producto</label>
            <select
              value={selectedProductId}
              onChange={e => setSelectedProductId(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm text-slate-800 dark:text-white"
            >
              <option value="" className="dark:bg-slate-800">Selecciona producto</option>
              {(() => {
                const list = [];
                const orig = Array.isArray(products) ? products : [];
                for (const p of orig) {
                  if (p.type === 'FISICO') {
                    list.push(p);
                  }
                }
                return list.map(product => (
                  <option key={product.id} value={product.id} className="dark:bg-slate-800">
                    {product.code} - {product.description}
                  </option>
                ));
              })()}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Fecha Inicio</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm text-slate-800 dark:text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Fecha Fin</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm text-slate-800 dark:text-white"
            />
          </div>
        </div>

        {selectedProduct && (
          <div className="bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-700/50 p-6 rounded-2xl mb-6 grid grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">Código</p>
              <p className="font-black text-slate-800 dark:text-white">{selectedProduct.code}</p>
            </div>
            <div>
              <p className="text-xs text-slate-505 dark:text-slate-400 font-bold uppercase mb-1">Stock Actual</p>
              <p className="font-black text-slate-800 dark:text-white">{selectedProduct.stock} unidades</p>
            </div>
            <div>
              <p className="text-xs text-slate-505 dark:text-slate-400 font-bold uppercase mb-1">Precio</p>
              <p className="font-black text-slate-800 dark:text-white">${selectedProduct.price.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-505 dark:text-slate-400 font-bold uppercase mb-1">Categoría</p>
              <p className="font-black text-slate-800 dark:text-white">{selectedProduct.category || 'N/A'}</p>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-200 dark:border-slate-700">
                <th className="text-left p-3 font-black text-slate-700 dark:text-slate-300 text-xs uppercase">Fecha</th>
                <th className="text-left p-3 font-black text-slate-750 dark:text-slate-300 text-xs uppercase">Tipo</th>
                <th className="text-left p-3 font-black text-slate-750 dark:text-slate-300 text-xs uppercase">Documento</th>
                <th className="text-left p-3 font-black text-slate-750 dark:text-slate-300 text-xs uppercase">Descripción</th>
                <th className="text-right p-3 font-black text-emerald-700 dark:text-emerald-450 text-xs uppercase">Entradas</th>
                <th className="text-right p-3 font-black text-red-750 dark:text-red-450 text-xs uppercase">Salidas</th>
                <th className="text-right p-3 font-black text-slate-750 dark:text-slate-300 text-xs uppercase">Saldo</th>
                <th className="text-right p-3 font-black text-slate-750 dark:text-slate-300 text-xs uppercase">Costo Unit.</th>
                <th className="text-right p-3 font-black text-slate-750 dark:text-slate-300 text-xs uppercase">Costo Total</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((mov, idx) => (
                <tr key={idx} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-900/10">
                  <td className="p-3 font-bold text-slate-600 dark:text-slate-400">{new Date(mov.date).toLocaleDateString()}</td>
                  <td className="p-3 font-bold text-slate-600 dark:text-slate-400">{mov.documentType}</td>
                  <td className="p-3 font-mono text-xs text-slate-700 dark:text-slate-300">{mov.documentNumber}</td>
                  <td className="p-3 font-bold text-slate-800 dark:text-white">{mov.description}</td>
                  <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{mov.quantityIn || '-'}</td>
                  <td className="p-3 text-right font-bold text-red-600 dark:text-red-405">{mov.quantityOut || '-'}</td>
                  <td className="p-3 text-right font-black text-slate-800 dark:text-white">{mov.balance}</td>
                  <td className="p-3 text-right font-bold text-slate-600 dark:text-slate-400">${mov.unitCost.toFixed(2)}</td>
                  <td className="p-3 text-right font-black text-sky-500 dark:text-sky-400">${mov.totalCost.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {movements.length === 0 && (
          <div className="text-center py-12">
            <InboxIcon className="w-16 h-16 mx-auto opacity-20 dark:text-slate-400" />
            <p className="text-slate-400 dark:text-slate-500 font-bold mt-4">
              {selectedProductId ? 'No hay movimientos en el rango seleccionado' : 'Selecciona un producto para ver su kardex'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
