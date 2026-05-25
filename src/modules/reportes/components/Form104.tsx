import React, { useState, useMemo } from 'react';
import { BanknotesIcon, ArrowDownTrayIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Document, BusinessInfo, Form104Data } from '../../../types/types';

interface Form104Props {
  documents: Document[];
  business: BusinessInfo;
  onNotify: (message: string, type?: 'success' | 'info' | 'warning') => void;
}

export default function Form104({ documents, business, onNotify }: Form104Props) {
  const [month, setMonth] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());

  const form104Data = useMemo((): Form104Data => {
    if (!month || !year) {
      return {
        period: '',
        taxableBase0: 0,
        taxableBase12: 0,
        generatedIva: 0,
        purchasesWithCredit: 0,
        ivaPurchases: 0,
        ivaToPayOrCredit: 0
      };
    }

    const filteredDocs = (Array.isArray(documents) ? documents : []).filter(doc => {
      const docDate = new Date(doc.issueDate);
      const docMonth = (docDate.getMonth() + 1).toString().padStart(2, '0');
      const docYear = docDate.getFullYear().toString();
      return docMonth === month && docYear === year && doc.status === 'AUTORIZADA' && doc.type === '01';
    });

    const salesDocs = filteredDocs.filter(d => (d as any).source !== 'RECEIVED');
    const purchaseDocs = filteredDocs.filter(d => (d as any).source === 'RECEIVED');

    const taxableBase0 = salesDocs.reduce((sum, doc) => {
      const sub0 = doc.items?.filter(i => i.taxRate === 0).reduce((s, item) => s + (item.unitPrice * item.quantity - item.discount), 0) || 0;
      return sum + sub0;
    }, 0);
    const taxableBase12 = salesDocs.reduce((sum, doc) => {
      const sub12 = doc.items?.filter(i => i.taxRate > 0).reduce((s, item) => s + (item.unitPrice * item.quantity - item.discount), 0) || 0;
      return sum + sub12;
    }, 0);
    const generatedIva = taxableBase12 * 0.15;

    const purchasesWithCredit = purchaseDocs.reduce((sum, doc) => {
      const base12 = doc.items?.filter(i => i.taxRate > 0).reduce((s, item) => s + (item.unitPrice * item.quantity - item.discount), 0) || 0;
      return sum + base12;
    }, 0);
    const ivaPurchases = purchaseDocs.reduce((sum, doc) => {
      const iva = doc.items?.filter(i => i.taxRate > 0).reduce((s, item) => s + ((item.unitPrice * item.quantity - item.discount) * (item.taxRate / 100)), 0) || 0;
      return sum + iva;
    }, 0);

    return {
      period: `${month}/${year}`,
      taxableBase0,
      taxableBase12,
      generatedIva,
      purchasesWithCredit,
      ivaPurchases,
      ivaToPayOrCredit: generatedIva - ivaPurchases
    };
  }, [documents, month, year]);

  const exportReport = () => {
    if (!month || !year) {
      onNotify('Selecciona mes y año', 'warning');
      return;
    }

    const report = `FORMULARIO 104 - DECLARACIÓN DEL IVA
RUC: ${business.ruc}
Razón Social: ${business.name}
Período: ${form104Data.period}

VENTAS
Base Imponible Tarifa 0%: $${form104Data.taxableBase0.toFixed(2)}
Base Imponible Tarifa 12%: $${form104Data.taxableBase12.toFixed(2)}
IVA Generado (12%): $${form104Data.generatedIva.toFixed(2)}

COMPRAS
Base Imponible con Crédito Tributario: $${form104Data.purchasesWithCredit.toFixed(2)}
IVA en Compras: $${form104Data.ivaPurchases.toFixed(2)}

RESUMEN
IVA a Pagar / Crédito Tributario: $${form104Data.ivaToPayOrCredit.toFixed(2)}
`;

    const blob = new Blob([report], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Formulario_104_${month}_${year}.txt`;
    link.click();

    onNotify('Formulario 104 exportado exitosamente');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/50 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <BanknotesIcon className="w-10 h-10 text-slate-600 dark:text-slate-300" />
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Formulario 104 - IVA</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-bold">Declaración mensual del Impuesto al Valor Agregado</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Mes</label>
            <select
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="w-full p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-200"
            >
              <option value="">Selecciona mes</option>
              <option value="01">Enero</option>
              <option value="02">Febrero</option>
              <option value="03">Marzo</option>
              <option value="04">Abril</option>
              <option value="05">Mayo</option>
              <option value="06">Junio</option>
              <option value="07">Julio</option>
              <option value="08">Agosto</option>
              <option value="09">Septiembre</option>
              <option value="10">Octubre</option>
              <option value="11">Noviembre</option>
              <option value="12">Diciembre</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Año</label>
            <input
              type="number"
              value={year}
              onChange={e => setYear(e.target.value)}
              min="2020"
              max="2030"
              className="w-full p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-200"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-gradient-to-br from-sky-50 to-sky-100 dark:from-sky-950/30 dark:to-sky-900/20 p-6 rounded-2xl border border-sky-200 dark:border-sky-800/40">
            <h3 className="font-black text-sky-900 dark:text-sky-300 mb-4 text-lg">VENTAS</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-sky-600 dark:text-sky-400">Base Imponible Tarifa 0%</span>
                <span className="text-xl font-black text-sky-900 dark:text-sky-200">${form104Data.taxableBase0.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-sky-600 dark:text-sky-400">Base Imponible Tarifa 12%</span>
                <span className="text-xl font-black text-sky-900 dark:text-sky-200">${form104Data.taxableBase12.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t-2 border-sky-300 dark:border-sky-700">
                <span className="text-sm font-bold text-sky-600 dark:text-sky-400">IVA Generado (15%)</span>
                <span className="text-2xl font-black text-sky-500 dark:text-sky-400">${form104Data.generatedIva.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 p-6 rounded-2xl border border-purple-200 dark:border-purple-800/40">
            <h3 className="font-black text-purple-900 dark:text-purple-300 mb-4 text-lg">COMPRAS</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-purple-700 dark:text-purple-400">Base con Crédito Tributario</span>
                <span className="text-xl font-black text-purple-900 dark:text-purple-200">${form104Data.purchasesWithCredit.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t-2 border-purple-300 dark:border-purple-700">
                <span className="text-sm font-bold text-purple-700 dark:text-purple-400">IVA en Compras</span>
                <span className="text-2xl font-black text-purple-600 dark:text-purple-400">${form104Data.ivaPurchases.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20 p-6 rounded-2xl border-2 border-emerald-300 dark:border-emerald-700/50">
            <div className="flex justify-between items-center">
              <span className="text-lg font-black text-emerald-900 dark:text-emerald-300">IVA A PAGAR / CRÉDITO TRIBUTARIO</span>
              <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">${form104Data.ivaToPayOrCredit.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <button
          onClick={exportReport}
          disabled={!month || !year}
          className="w-full mt-6 py-4 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl font-black uppercase text-sm tracking-wide shadow-lg shadow-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowDownTrayIcon className="w-4 h-4 inline" /> Exportar Declaración
        </button>

        <div className="mt-6 bg-amber-50 dark:bg-amber-950/30 p-4 rounded-xl border border-amber-200 dark:border-amber-800/40">
          <p className="text-xs text-amber-800 dark:text-amber-400 font-bold">
            <ExclamationTriangleIcon className="w-4 h-4 inline text-amber-600 dark:text-amber-500" /> Este es un resumen calculado automáticamente. Verifica los valores antes de presentar la declaración oficial en el SRI.
          </p>
        </div>
      </div>
    </div>
  );
}
