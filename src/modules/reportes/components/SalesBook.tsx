import React, { useState, useMemo } from 'react';
import { Document, BusinessInfo, SalesBookEntry } from '../../../types/types';
import { BookOpenIcon, ArrowDownTrayIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

interface SalesBookProps {
  documents: Document[];
  business: BusinessInfo;
  onNotify: (message: string, type?: 'success' | 'info' | 'warning') => void;
}

export default function SalesBook({ documents, business, onNotify }: SalesBookProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | '01' | '04'>('ALL');

  const salesEntries = useMemo((): SalesBookEntry[] => {
    if (!Array.isArray(documents)) return [];
    
    const entries: SalesBookEntry[] = [];
    for (const doc of documents) {
      if (doc.status !== 'AUTORIZADA') continue;
      if (filterType !== 'ALL' && doc.type !== filterType) continue;
      
      const docDate = new Date(doc.issueDate);
      if (startDate && docDate < new Date(startDate)) continue;
      if (endDate && docDate > new Date(endDate)) continue;
      
      let subtotal0 = 0;
      let subtotal12 = 0;
      if (doc.items) {
        for (const item of doc.items) {
          const base = item.unitPrice * item.quantity - item.discount;
          if (item.taxRate === 0) {
            subtotal0 += base;
          } else {
            subtotal12 += base;
          }
        }
      }
      const iva = subtotal12 * 0.15;
      
      entries.push({
        date: doc.issueDate,
        documentType: doc.type === '01' ? 'FACTURA' : doc.type === '04' ? 'NOTA DE CRÉDITO' : 'OTRO',
        documentNumber: doc.number,
        authorizationNumber: doc.accessKey,
        clientRuc: doc.entityName.split(' - ')[0] || '',
        clientName: doc.entityName,
        subtotal0,
        subtotal12,
        iva,
        total: doc.total
      });
    }
    return entries;
  }, [documents, startDate, endDate, filterType]);

  const totals = useMemo(() => {
    return salesEntries.reduce((acc, entry) => ({
      subtotal0: acc.subtotal0 + entry.subtotal0,
      subtotal12: acc.subtotal12 + entry.subtotal12,
      iva: acc.iva + entry.iva,
      total: acc.total + entry.total
    }), { subtotal0: 0, subtotal12: 0, iva: 0, total: 0 });
  }, [salesEntries]);

  const exportToCSV = () => {
    let csv = 'Fecha,Tipo Documento,Número,Autorización,RUC Cliente,Cliente,Base 0%,Base 12%,IVA,Total\n';
    
    salesEntries.forEach(entry => {
      csv += `${entry.date},${entry.documentType},${entry.documentNumber},${entry.authorizationNumber},${entry.clientRuc},"${entry.clientName}",${entry.subtotal0.toFixed(2)},${entry.subtotal12.toFixed(2)},${entry.iva.toFixed(2)},${entry.total.toFixed(2)}\n`;
    });

    csv += `\nTOTALES,,,,,,$${totals.subtotal0.toFixed(2)},$${totals.subtotal12.toFixed(2)},$${totals.iva.toFixed(2)},$${totals.total.toFixed(2)}`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `libro_ventas_${startDate}_${endDate}.csv`;
    link.click();
    
    onNotify('Libro de ventas exportado exitosamente');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/50 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BookOpenIcon className="w-8 h-8 text-slate-400 dark:text-slate-500" />
            <div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Libro de Ventas</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-bold">Registro detallado de documentos emitidos</p>
            </div>
          </div>
          <button type="button"
            onClick={exportToCSV}
            disabled={salesEntries.length === 0}
            className="px-6 py-3 bg-sky-500 text-white rounded-xl font-bold text-sm hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            <ArrowDownTrayIcon className="w-4 h-4" /> Exportar CSV
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Fecha Inicio</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-200"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Fecha Fin</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-200"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Tipo</label>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value as any)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-200"
            >
              <option value="ALL">Todos</option>
              <option value="01">Facturas</option>
              <option value="04">Notas de Crédito</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-200 dark:border-slate-700">
                <th className="text-left p-3 font-black text-slate-700 dark:text-slate-300 text-xs uppercase">Fecha</th>
                <th className="text-left p-3 font-black text-slate-700 dark:text-slate-300 text-xs uppercase">Tipo</th>
                <th className="text-left p-3 font-black text-slate-700 dark:text-slate-300 text-xs uppercase">Número</th>
                <th className="text-left p-3 font-black text-slate-700 dark:text-slate-300 text-xs uppercase">Cliente</th>
                <th className="text-right p-3 font-black text-slate-700 dark:text-slate-300 text-xs uppercase">Base 0%</th>
                <th className="text-right p-3 font-black text-slate-700 dark:text-slate-300 text-xs uppercase">Base 12%</th>
                <th className="text-right p-3 font-black text-slate-700 dark:text-slate-300 text-xs uppercase">IVA</th>
                <th className="text-right p-3 font-black text-slate-700 dark:text-slate-300 text-xs uppercase">Total</th>
              </tr>
            </thead>
            <tbody>
              {salesEntries.map((entry, idx) => (
                <tr key={idx} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="p-3 font-bold text-slate-600 dark:text-slate-400">{new Date(entry.date).toLocaleDateString()}</td>
                  <td className="p-3 font-bold text-slate-600 dark:text-slate-400">{entry.documentType}</td>
                  <td className="p-3 font-mono text-xs text-slate-700 dark:text-slate-300">{entry.documentNumber}</td>
                  <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{entry.clientName}</td>
                  <td className="p-3 text-right font-bold text-slate-600 dark:text-slate-400">${entry.subtotal0.toFixed(2)}</td>
                  <td className="p-3 text-right font-bold text-slate-600 dark:text-slate-400">${entry.subtotal12.toFixed(2)}</td>
                  <td className="p-3 text-right font-bold text-sky-500 dark:text-sky-400">${entry.iva.toFixed(2)}</td>
                  <td className="p-3 text-right font-black text-slate-800 dark:text-white">${entry.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 dark:bg-slate-900/50 border-t-2 border-slate-300 dark:border-slate-700">
                <td colSpan={4} className="p-3 font-black text-slate-800 dark:text-white uppercase">TOTALES</td>
                <td className="p-3 text-right font-black text-slate-800 dark:text-white">${totals.subtotal0.toFixed(2)}</td>
                <td className="p-3 text-right font-black text-slate-800 dark:text-white">${totals.subtotal12.toFixed(2)}</td>
                <td className="p-3 text-right font-black text-sky-500 dark:text-sky-400">${totals.iva.toFixed(2)}</td>
                <td className="p-3 text-right font-black text-slate-800 dark:text-white">${totals.total.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {salesEntries.length === 0 && (
          <div className="text-center py-12">
            <EnvelopeIcon className="w-16 h-16 mx-auto text-slate-200 dark:text-slate-700" />
            <p className="text-slate-400 dark:text-slate-500 font-bold mt-4">No hay documentos en el rango seleccionado</p>
          </div>
        )}
      </div>
    </div>
  );
}
