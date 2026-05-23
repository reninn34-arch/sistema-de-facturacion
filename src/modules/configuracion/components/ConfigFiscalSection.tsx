import React from 'react';
import { DocumentTextIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { BUSINESS_TYPES, BusinessType } from '../../../types/types';

interface ConfigFiscalSectionProps {
  businessInfo: any;
  setBusinessInfo: (fn: (prev: any) => any) => void;
  isUserAdmin: boolean;
}

const ConfigFiscalSection: React.FC<ConfigFiscalSectionProps> = ({ businessInfo, setBusinessInfo, isUserAdmin }) => {
  if (!isUserAdmin) return null;

  return (
    <div className="lg:col-span-2 space-y-8">
      {/* Datos Tributarios */}
      <section className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-700/50 shadow-sm dark:shadow-lg dark:shadow-black/10 space-y-8 transition-colors duration-300">
        <h3 className="font-black text-slate-800 dark:text-white text-xl uppercase tracking-tighter border-b border-slate-50 dark:border-slate-700/50 pb-4 flex items-center gap-3">
          <DocumentTextIcon className="w-6 h-6 text-sky-500" /> Información Legal (SRI)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">RUC</label>
            <input type="text" value={businessInfo.ruc || ''} placeholder="1234567890001" maxLength={13}
              className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-2xl font-black text-sm outline-none border-2 border-transparent focus:border-sky-500 transition-colors"
              onChange={e => setBusinessInfo((prev: any) => ({ ...prev, ruc: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
              {businessInfo.taxpayerType === 'PERSONA_NATURAL' ? 'Nombre Completo' : 'Razón Social'}
            </label>
            <input type="text" value={businessInfo.name || ''} placeholder={businessInfo.taxpayerType === 'PERSONA_NATURAL' ? 'Ej: Juan Pérez Gómez' : 'Ej: CORPORACION EJEMPLO S.A.'}
              className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-sky-500 transition-colors"
              onChange={e => setBusinessInfo((prev: any) => ({ ...prev, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nombre Comercial</label>
            <input type="text" value={businessInfo.tradename || ''} placeholder="Ej: Azul ENTERPRISE"
              className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-sky-500 transition-colors"
              onChange={e => setBusinessInfo((prev: any) => ({ ...prev, tradename: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Dirección Matriz</label>
            <input type="text" value={businessInfo.address || ''}
              className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-sky-500 transition-colors"
              onChange={e => setBusinessInfo((prev: any) => ({ ...prev, address: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Dirección Sucursal</label>
            <input type="text" value={businessInfo.branchAddress || ''}
              className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-sky-500 transition-colors"
              onChange={e => setBusinessInfo((prev: any) => ({ ...prev, branchAddress: e.target.value }))} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Obligado Contabilidad</label>
            <div className="flex bg-slate-50 dark:bg-slate-800/50 p-1 rounded-2xl h-[52px]">
              <button onClick={() => setBusinessInfo((prev: any) => ({ ...prev, isAccountingObliged: true }))} className={`flex-1 rounded-xl text-[10px] font-black uppercase transition-all ${businessInfo.isAccountingObliged ? 'bg-white dark:bg-slate-700 shadow-sm text-sky-500 dark:text-sky-400' : 'text-slate-400'}`}>SÍ</button>
              <button onClick={() => setBusinessInfo((prev: any) => ({ ...prev, isAccountingObliged: false }))} className={`flex-1 rounded-xl text-[10px] font-black uppercase transition-all ${!businessInfo.isAccountingObliged ? 'bg-white dark:bg-slate-700 shadow-sm text-sky-500 dark:text-sky-400' : 'text-slate-400'}`}>NO</button>
            </div>
          </div>
        </div>
      </section>

      {/* Régimen Especial */}
      <section className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-700/50 shadow-sm dark:shadow-lg dark:shadow-black/10 space-y-8 transition-colors duration-300">
        <h3 className="font-black text-slate-800 dark:text-white text-xl uppercase tracking-tighter border-b border-slate-50 dark:border-slate-700/50 pb-4 flex items-center gap-3">
          <ShieldCheckIcon className="w-6 h-6 text-emerald-500" /> Regímenes Especiales
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Tipo de Régimen</label>
            <select className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-2xl font-bold text-sm outline-none" value={businessInfo.regime} onChange={e => setBusinessInfo((prev: any) => ({ ...prev, regime: e.target.value as any }))}>
              <option value="GENERAL">Régimen General</option>
              <option value="RIMPE_EMPRENDEDOR">RIMPE - Emprendedor</option>
              <option value="RIMPE_POPULAR">RIMPE - Negocio Popular</option>
              <option value="ARTESANO">Artesano Calificado</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Agente de Retención (Res.)</label>
            <input type="text" placeholder="Ej: NAC-DNCRASC20-00000001" value={businessInfo.withholdingAgentCode || ''}
              className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-2xl font-bold text-sm"
              onChange={e => setBusinessInfo((prev: any) => ({ ...prev, withholdingAgentCode: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Contribuyente Especial (Nro)</label>
            <input type="text" placeholder="Ej: 000" value={businessInfo.specialTaxpayerCode || ''}
              className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-2xl font-bold text-sm"
              onChange={e => setBusinessInfo((prev: any) => ({ ...prev, specialTaxpayerCode: e.target.value }))} />
          </div>
        </div>
      </section>

      {/* Tipo de Negocio */}
      <section className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-700/50 shadow-sm dark:shadow-lg dark:shadow-black/10 space-y-8 transition-colors duration-300">
        <h3 className="font-black text-slate-800 dark:text-white text-xl uppercase tracking-tighter border-b border-slate-50 dark:border-slate-700/50 pb-4 flex items-center gap-3">
          <ShieldCheckIcon className="w-6 h-6 text-sky-500" /> Tipo de Negocio
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Object.entries(BUSINESS_TYPES).map(([key, val]) => (
            <button key={key}
              onClick={() => setBusinessInfo((prev: any) => ({ ...prev, businessType: key as BusinessType }))}
              className={`p-4 rounded-2xl font-bold text-sm transition-all border-2 text-left ${(businessInfo as any).businessType === key || (!(businessInfo as any).businessType && key === 'GENERAL') ? 'border-sky-500 bg-sky-50 dark:bg-sky-500/10' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
              <span className="text-lg">{val.icon}</span>
              <p className="font-black text-slate-800 dark:text-white mt-1">{val.label}</p>
              <p className="text-[10px] text-slate-400">{val.description}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

export default ConfigFiscalSection;
