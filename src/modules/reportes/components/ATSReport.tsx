import React, { useState, useId } from 'react';
import { ChartBarIcon, InformationCircleIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { Document, BusinessInfo, ATSPurchase, ATSSale } from '../../../types/types';
import { generateATSXML } from '../../../services/atsService';

interface ATSReportProps {
  documents: Document[];
  business: BusinessInfo;
  onNotify: (message: string, type?: 'success' | 'info' | 'warning') => void;
}

// Mismo redondeo que el resto del sistema: el SRI cuadra al centavo.
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// Tipo de identificación del ATS a partir de la identificación real.
// 04=RUC, 05=Cédula, 06=Pasaporte/otro, 07=Consumidor final.
const atsIdType = (id: string): '04' | '05' | '06' | '07' => {
  if (!id || id === '9999999999999') return '07';
  if (id.length === 13) return '04';
  if (id.length === 10) return '05';
  return '06';
};

// Suma las bases de un documento separando 0% e IVA, redondeando por línea.
// El descuento puede venir nulo desde la BD: sin `|| 0` el total se volvía NaN.
const sumDocBases = (doc: Document) => {
  let subtotal0 = 0;
  let subtotalIva = 0;
  for (const item of doc.items || []) {
    const amount = round2(item.unitPrice * item.quantity - (item.discount || 0));
    if (item.taxRate === 0) subtotal0 += amount; else subtotalIva += amount;
  }
  return { subtotal0: round2(subtotal0), subtotal12: round2(subtotalIva) };
};

export default function ATSReport({ documents, business, onNotify }: ATSReportProps) {
  const fieldId = useId();
  const [month, setMonth] = useState('');
  const [year, setYear] = useState(() => new Date().getFullYear().toString());

  const generateATS = () => {
    if (!month || !year) {
      onNotify('Selecciona mes y año', 'warning');
      return;
    }

    const period = `${month}${year}`;
    
    // Filtrar documentos del período
    const filteredDocs = (Array.isArray(documents) ? documents : []).filter(doc => {
      const docDate = new Date(doc.issueDate);
      const docMonth = (docDate.getMonth() + 1).toString().padStart(2, '0');
      const docYear = docDate.getFullYear().toString();
      return docMonth === month && docYear === year && doc.status === 'AUTORIZADA';
    });

    // Generar ventas del ATS
    const sales: ATSSale[] = [];
    for (const doc of filteredDocs) {
      if (doc.type === '01' && (doc as any).source !== 'RECEIVED') {
        const { subtotal0, subtotal12 } = sumDocBases(doc);
        const iva = round2(subtotal12 * 0.15);
        // La identificación sale del campo real (igual que en compras). Antes se
        // parseaba del NOMBRE del cliente, así que el ATS podía declarar el nombre
        // como si fuera la cédula.
        const clientId = doc.entityRuc || '9999999999999';
        sales.push({
          establishmentType: '01' as const,
          documentType: doc.type,
          documentNumber: doc.number,
          authorizationNumber: doc.accessKey,
          issueDate: doc.issueDate,
          clientIdType: atsIdType(clientId),
          clientId,
          clientName: doc.entityName,
          subtotal0,
          subtotal12,
          iva
        });
      }
    }

    // Compras: documentos recibidos (source=RECEIVED)
    const purchases: ATSPurchase[] = [];
    for (const doc of filteredDocs) {
      if (doc.type === '01' && (doc as any).source === 'RECEIVED') {
        const { subtotal0, subtotal12 } = sumDocBases(doc);
        const iva = round2(subtotal12 * 0.15);
        const providerId = doc.entityRuc || '9999999999999';
        const idType = providerId.length === 13 ? '01' : '02';
        purchases.push({
          establishmentType: '01' as const,
          idProviderType: idType as '01' | '02',
          providerRuc: providerId,
          providerName: doc.entityName,
          authorizationDate: doc.issueDate,
          documentType: '01',
          transactionType: '01' as const,
          documentNumber: doc.number,
          authorizationNumber: doc.accessKey || 'N/A',
          subtotal0,
          subtotal12,
          iva,
          ice: 0,
          retentionPercentage: 0,
          retentionAmount: 0
        });
      }
    }

    const xml = generateATSXML({
      ruc: business.ruc,
      businessName: business.name,
      period,
      purchases,
      sales
    });

    // Descargar XML
    const blob = new Blob([xml], { type: 'application/xml' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ATS_${business.ruc}_${period}.xml`;
    link.click();

    onNotify('ATS generado exitosamente');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/50 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <ChartBarIcon className="w-10 h-10 text-slate-600 dark:text-slate-300" />
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Anexo Transaccional Simplificado</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-bold">Genera el archivo XML para el SRI</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor={`${fieldId}-month`} className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Mes</label>
              <select
                id={`${fieldId}-month`}
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
              <label htmlFor={`${fieldId}-year`} className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Año</label>
              <input
                id={`${fieldId}-year`}
                type="number"
                value={year}
                onChange={e => setYear(e.target.value)}
                min="2020"
                max="2030"
                className="w-full p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          <div className="bg-sky-50 dark:bg-sky-950/30 p-6 rounded-2xl border border-sky-100 dark:border-sky-800/40">
            <h3 className="font-black text-sky-900 dark:text-sky-300 text-sm mb-2"><InformationCircleIcon className="w-4 h-4 inline" /> Información</h3>
            <ul className="text-xs text-sky-600 dark:text-sky-400 space-y-1 font-bold">
              <li>• El ATS debe presentarse hasta el día 28 del mes siguiente</li>
              <li>• Incluye todas las transacciones autorizadas del período</li>
              <li>• El archivo XML debe subirse al portal del SRI</li>
              <li>• Mantén respaldo de los archivos generados</li>
            </ul>
          </div>

          <button type="button"
            onClick={generateATS}
            className="w-full py-4 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl font-black uppercase text-sm tracking-wide shadow-lg shadow-sky-500/20"
          >
            <ArrowDownTrayIcon className="w-4 h-4 inline" /> Generar ATS (XML)
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
          <h3 className="font-black text-slate-700 dark:text-slate-200 mb-4">Resumen del Período</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">RUC</p>
              <p className="font-black text-slate-800 dark:text-white">{business.ruc}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">Razón Social</p>
              <p className="font-black text-slate-800 dark:text-white text-sm">{business.name}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">Período</p>
              <p className="font-black text-slate-800 dark:text-white">{month}/{year}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
