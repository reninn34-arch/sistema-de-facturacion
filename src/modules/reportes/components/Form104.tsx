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

    const taxableBase0 = filteredDocs.reduce((sum, doc) => {
      const subtotal0 = doc.items?.filter(i => i.taxRate === 0).reduce((s, item) => s + (item.unitPrice * item.quantity - item.discount), 0) || 0;
      return sum + subtotal0;
    }, 0);
    const taxableBase12 = filteredDocs.reduce((sum, doc) => {
      const subtotal12 = doc.items?.filter(i => i.taxRate > 0).reduce((s, item) => s + (item.unitPrice * item.quantity - item.discount), 0) || 0;
      return sum + subtotal12;
    }, 0);
    const generatedIva = taxableBase12 * 0.15;

    return {
      period: `${month}/${year}`,
      taxableBase0,
      taxableBase12,
      generatedIva,
      purchasesWithCredit: 0, // Requiere módulo de compras
      ivaPurchases: 0, // Requiere módulo de compras
      ivaToPayOrCredit: generatedIva
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
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <BanknotesIcon className="w-10 h-10" />
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Formulario 104 - IVA</h2>
            <p className="text-sm text-slate-500 font-bold">Declaración mensual del Impuesto al Valor Agregado</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 uppercase">Mes</label>
            <select
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm"
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
            <label className="text-xs font-bold text-slate-600 uppercase">Año</label>
            <input
              type="number"
              value={year}
              onChange={e => setYear(e.target.value)}
              min="2020"
              max="2030"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-2xl border border-indigo-200">
            <h3 className="font-black text-indigo-900 mb-4 text-lg">VENTAS</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-indigo-700">Base Imponible Tarifa 0%</span>
                <span className="text-xl font-black text-indigo-900">${form104Data.taxableBase0.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-indigo-700">Base Imponible Tarifa 12%</span>
                <span className="text-xl font-black text-indigo-900">${form104Data.taxableBase12.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t-2 border-blue-300">
                <span className="text-sm font-bold text-indigo-700">IVA Generado (15%)</span>
                <span className="text-2xl font-black text-indigo-700">${form104Data.generatedIva.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl border border-purple-200">
            <h3 className="font-black text-purple-900 mb-4 text-lg">COMPRAS</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-purple-700">Base con Crédito Tributario</span>
                <span className="text-xl font-black text-purple-900">${form104Data.purchasesWithCredit.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t-2 border-purple-300">
                <span className="text-sm font-bold text-purple-700">IVA en Compras</span>
                <span className="text-2xl font-black text-purple-600">${form104Data.ivaPurchases.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-2xl border-2 border-emerald-300">
            <div className="flex justify-between items-center">
              <span className="text-lg font-black text-emerald-900">IVA A PAGAR / CRÉDITO TRIBUTARIO</span>
              <span className="text-3xl font-black text-emerald-600">${form104Data.ivaToPayOrCredit.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <button
          onClick={exportReport}
          disabled={!month || !year}
          className="w-full mt-6 py-4 bg-indigo-700 hover:bg-indigo-800 text-white rounded-2xl font-black uppercase text-sm tracking-wide shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowDownTrayIcon className="w-4 h-4 inline" /> Exportar Declaración
        </button>

        <div className="mt-6 bg-amber-50 p-4 rounded-xl border border-amber-200">
          <p className="text-xs text-amber-800 font-bold">
            <ExclamationTriangleIcon className="w-4 h-4 inline text-amber-600" /> Este es un resumen calculado automáticamente. Verifica los valores antes de presentar la declaración oficial en el SRI.
          </p>
        </div>
      </div>
    </div>
  );
}
