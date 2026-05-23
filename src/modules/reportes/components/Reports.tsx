
import React, { useState, useMemo } from 'react';
import { Document, DocumentType, SriStatus, PaymentStatus, BusinessInfo } from '../../../types/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import RideViewer from '../../facturacion/components/RideViewer';
import { ScaleIcon, BanknotesIcon, BuildingOffice2Icon, LightBulbIcon, DocumentTextIcon, TrophyIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface ReportsProps {
  documents: Document[];
  businessInfo: BusinessInfo;
  onConvertProforma?: (doc: Document) => void;
  setActiveTab?: (tab: string) => void;
}

const Reports: React.FC<ReportsProps> = ({ documents, businessInfo, onConvertProforma, setActiveTab }) => {
  const [activeSubTab, setActiveSubTab] = useState<'CARTERA' | 'TRIBUTOS' | 'SRI' | 'PROFORMAS'>('TRIBUTOS');
  const [filter, setFilter] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');
  const [selectedDocForRide, setSelectedDocForRide] = useState<Document | null>(null);
  const safeDocuments = Array.isArray(documents) ? documents : [];

  const fiscalStats = useMemo(() => {
    let sub15 = 0;
    let sub0 = 0;
    let totalIva = 0;
    let totalNeto = 0;
    
    safeDocuments.filter(d => d.type === DocumentType.INVOICE && d.status === SriStatus.AUTHORIZED).forEach(doc => {
      // Si el documento tiene ítems guardados, calculamos sobre ellos
      if (doc.items && doc.items.length > 0) {
        doc.items.forEach(it => {
          const base = it.quantity * it.unitPrice - it.discount;
          if (it.taxRate > 0) {
            sub15 += base;
            totalIva += base * (it.taxRate / 100);
          } else {
            sub0 += base;
          }
        });
      } else {
        // Fallback para documentos sin ítems (aproximación)
        const s15 = doc.total / 1.15;
        sub15 += s15;
        totalIva += doc.total - s15;
      }
      totalNeto += doc.total;
    });
    return { sub15, sub0, totalIva, totalNeto };
  }, [documents]);

  const chartData = useMemo(() => {
    return [
      { name: 'Sub15%', valor: fiscalStats.sub15, color: '#2563eb' },
      { name: 'Sub0%', valor: fiscalStats.sub0, color: '#94a3b8' },
      { name: 'IVA 15%', valor: fiscalStats.totalIva, color: '#6366f1' },
    ];
  }, [fiscalStats]);

  const topClients = useMemo(() => {
    const clientMap: Record<string, { name: string; total: number; count: number }> = {};
    safeDocuments.filter(d => d.type === DocumentType.INVOICE && d.status === SriStatus.AUTHORIZED).forEach(doc => {
      const key = doc.entityName || 'CONSUMIDOR FINAL';
      if (!clientMap[key]) clientMap[key] = { name: key, total: 0, count: 0 };
      clientMap[key].total += doc.total || 0;
      clientMap[key].count += 1;
    });
    return Object.values(clientMap).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [safeDocuments]);

  const topClientsChartData = useMemo(() =>
    topClients.map(c => ({ name: c.name.length > 18 ? c.name.slice(0, 16) + '..' : c.name, valor: c.total })),
  [topClients]);

  const proformas = useMemo(() =>
    safeDocuments.filter(d => d.type === DocumentType.PROFORMA),
  [safeDocuments]);

  const pendingReceivables = useMemo(() =>
    safeDocuments.filter(d => d.paymentStatus === PaymentStatus.PENDING && d.status === SriStatus.AUTHORIZED && d.type === DocumentType.INVOICE),
  [safeDocuments]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex bg-white p-2 rounded-[2rem] shadow-sm border border-slate-100 max-w-fit mx-auto lg:mx-0">
        {[
          { id: 'TRIBUTOS', label: 'Resumen Fiscal', icon: <ScaleIcon className="w-4 h-4" /> },
          { id: 'CARTERA', label: 'Top Clientes', icon: <TrophyIcon className="w-4 h-4" /> },
          { id: 'SRI', label: 'Documentos SRI', icon: <BuildingOffice2Icon className="w-4 h-4" /> },
          { id: 'PROFORMAS', label: 'Proformas', icon: <DocumentTextIcon className="w-4 h-4" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`px-8 py-4 rounded-[1.5rem] flex items-center gap-3 text-xs font-black uppercase tracking-widest transition-all ${
              activeSubTab === tab.id ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {activeSubTab === 'TRIBUTOS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total IVA Generado</p>
              <h4 className="text-4xl font-black text-sky-500 tracking-tighter">${fiscalStats.totalIva.toFixed(2)}</h4>
            </div>
            <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white">
              <h5 className="font-black text-sm uppercase tracking-widest mb-4 text-sky-400 flex items-center gap-2"><LightBulbIcon className="w-4 h-4" /> Tip Fiscal</h5>
              <p className="text-xs leading-relaxed text-slate-400 font-medium">Recuerda que el IVA se declara mensualmente según tu noveno dígito del RUC.</p>
            </div>
          </div>
          <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm min-h-[400px]">
            {/* 
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'black', fill: '#94a3b8'}} />
                <YAxis hide />
                <Tooltip />
                <Bar dataKey="valor" radius={[12, 12, 0, 0]} barSize={60}>
                  {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            */}
            <div className="flex items-center justify-center h-full text-slate-400">
                Gráfico deshabilitado temporalmente (Incompatibilidad detectada)
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'SRI' && (
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-10 border-b border-slate-50">
            <h3 className="text-2xl font-black text-slate-800 tracking-tighter">Comprobantes Autorizados</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400">
                <tr>
                  <th className="py-5 px-10 text-left">Nro Documento</th>
                  <th className="py-5 text-left">Cliente</th>
                  <th className="py-5 text-center">Estado</th>
                  <th className="py-5 px-10 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {safeDocuments.map(doc => (
                  <tr key={doc.id} className="hover:bg-slate-50/50">
                    <td className="py-6 px-10">
                      <p className="text-xs font-black text-slate-800">{doc.number}</p>
                      <p className="text-[9px] text-slate-400 font-mono mt-0.5">{doc.issueDate}</p>
                    </td>
                    <td className="py-6 text-sm font-bold text-slate-600">{doc.entityName}</td>
                    <td className="py-6 text-center">
                      <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-[9px] font-black uppercase">Autorizado</span>
                    </td>
                    <td className="py-6 px-10 text-right">
                      <div className="flex justify-end gap-2">
                         <button 
                          onClick={() => setSelectedDocForRide(doc)}
                          className="px-4 py-2 bg-sky-500 text-white hover:bg-sky-600 rounded-lg text-[9px] font-black uppercase transition-all"
                         >
                           Ver RIDE
                         </button>
                         <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-[9px] font-black uppercase transition-all">XML</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'CARTERA' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Facturado</p>
              <h4 className="text-3xl font-black text-emerald-500 tracking-tighter">${topClients.reduce((s, c) => s + c.total, 0).toFixed(2)}</h4>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Clientes Activos</p>
              <h4 className="text-3xl font-black text-sky-500 tracking-tighter">{topClients.length}</h4>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pendientes de Cobro</p>
              <h4 className="text-3xl font-black text-amber-500 tracking-tighter">${pendingReceivables.reduce((s, d) => s + (d.total || 0), 0).toFixed(2)}</h4>
            </div>
          </div>

          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-10">
            <h3 className="text-xl font-black text-slate-800 tracking-tighter mb-6 flex items-center gap-2">
              <TrophyIcon className="w-6 h-6 text-amber-500" />
              Top 10 Clientes por Facturación
            </h3>
            {topClients.length > 0 ? (
              <div className="space-y-3">
                {topClients.map((client, idx) => (
                  <div key={client.name} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${idx === 0 ? 'bg-amber-500 text-white' : idx < 3 ? 'bg-slate-300 text-slate-700' : 'bg-slate-100 text-slate-400'}`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm text-slate-800">{client.name}</p>
                      <p className="text-xs text-slate-400">{client.count} factura(s)</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-sky-500">${client.total.toFixed(2)}</p>
                      <div className="w-32 h-2 bg-slate-100 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-sky-500 rounded-full" style={{ width: `${Math.min(100, (client.total / (topClients[0]?.total || 1)) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <TrophyIcon className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                <p className="font-bold">Sin datos de facturación</p>
                <p className="text-sm">Los clientes aparecerán aquí al emitir facturas autorizadas.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'PROFORMAS' && (
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-10 border-b border-slate-50 flex justify-between items-center">
            <h3 className="text-2xl font-black text-slate-800 tracking-tighter">Proformas</h3>
            <span className="bg-amber-100 text-amber-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase">{proformas.length} pendientes</span>
          </div>
          {proformas.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400">
                  <tr>
                    <th className="py-5 px-10 text-left">Nro Proforma</th>
                    <th className="py-5 text-left">Cliente</th>
                    <th className="py-5 text-right">Total</th>
                    <th className="py-5 px-10 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {proformas.map(doc => (
                    <tr key={doc.id} className="hover:bg-slate-50/50">
                      <td className="py-6 px-10">
                        <p className="text-xs font-black text-slate-800">{doc.number}</p>
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">{doc.issueDate}</p>
                      </td>
                      <td className="py-6 text-sm font-bold text-slate-600">{doc.entityName}</td>
                      <td className="py-6 text-right font-black text-amber-500">${(doc.total || 0).toFixed(2)}</td>
                      <td className="py-6 px-10 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setSelectedDocForRide(doc)}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-[9px] font-black uppercase transition-all"
                          >
                            Ver RIDE
                          </button>
                          {onConvertProforma && (
                            <button
                              onClick={() => onConvertProforma(doc)}
                              className="px-4 py-2 bg-sky-500 text-white hover:bg-sky-600 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-1"
                            >
                              <ArrowPathIcon className="w-3 h-3" />
                              Convertir
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400">
              <DocumentTextIcon className="w-12 h-12 mx-auto mb-3 text-slate-200" />
              <p className="font-bold">No hay proformas</p>
              <p className="text-sm">Genere una factura marcando "Es Proforma" en el panel de emisión.</p>
            </div>
          )}
        </div>
      )}

      {selectedDocForRide && (
        <RideViewer 
          document={selectedDocForRide} 
          businessInfo={businessInfo} 
          items={selectedDocForRide.items || []} 
          onClose={() => setSelectedDocForRide(null)} 
        />
      )}
    </div>
  );
};

export default Reports;
