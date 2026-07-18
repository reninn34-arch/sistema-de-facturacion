import React, { useRef, useId } from 'react';
import { KeyIcon, EyeIcon, EyeSlashIcon, TrashIcon } from '@heroicons/react/24/outline';

interface ConfigSignatureSectionProps {
  signatureFile: File | null;
  signaturePassword: string;
  showSignaturePassword: boolean;
  businessInfo: any;
  setSignatureFile: (f: File | null) => void;
  setSignatureBuffer: (b: ArrayBuffer | null) => void;
  setSignaturePassword: (p: string) => void;
  setShowSignaturePassword: (v: boolean) => void;
  setBusinessInfo: (fn: (prev: any) => any) => void;
  saveBusinessField: (data: any) => void;
  saveBusinessConfig: () => void;
  showNotify: (msg: string, type?: any) => void;
  handleSignatureFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ConfigSignatureSection: React.FC<ConfigSignatureSectionProps> = ({
  signatureFile, signaturePassword, showSignaturePassword, businessInfo,
  setSignatureFile, setSignatureBuffer, setSignaturePassword, setShowSignaturePassword,
  setBusinessInfo, saveBusinessField, saveBusinessConfig, showNotify, handleSignatureFileChange
}) => {
  const fieldId = useId();
  return (
    <div className="space-y-8">
      <section className="bg-slate-900 dark:bg-slate-900 text-white p-10 rounded-[3rem] space-y-8 shadow-2xl dark:shadow-black/30 border border-transparent dark:border-slate-700/50">
        <div className="flex items-center justify-between border-b border-white/10 dark:border-slate-700/50 pb-6">
          <h3 className="font-black text-sky-400 text-xs uppercase tracking-widest">Certificado P12</h3>
          <div className={`w-3 h-3 rounded-full ${signatureFile ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
        </div>

        <div className="space-y-6">
          <label className="w-full py-10 border-2 border-dashed border-white/20 hover:border-sky-500 hover:bg-white/5 rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all">
            <KeyIcon className="w-8 h-8 mb-3 text-white/50" />
            <p className="text-[10px] font-black uppercase tracking-widest text-white/50">{signatureFile ? signatureFile.name : 'Subir firma .p12'}</p>
            <input type="file" className="hidden" accept=".p12" onChange={handleSignatureFileChange} />
          </label>

          <div className="space-y-2">
            <label htmlFor={`${fieldId}-signaturePassword`} className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Contraseña de Firma</label>
            <div className="relative">
              <input id={`${fieldId}-signaturePassword`} type={showSignaturePassword ? "text" : "password"} placeholder="••••••••" value={signaturePassword}
                onChange={e => {
                  setSignaturePassword(e.target.value);
                  const updatedFeatures = { ...((businessInfo as any).features || {}), signaturePassword: e.target.value };
                  setBusinessInfo((prev: any) => ({ ...prev, features: updatedFeatures }));
                  saveBusinessField({ features: updatedFeatures });
                }}
                className="w-full p-4 pr-12 bg-white/5 border border-white/10 rounded-2xl font-bold text-sm focus:border-sky-500 outline-none" />
              <button type="button" aria-label={showSignaturePassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShowSignaturePassword(!showSignaturePassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-sky-400 transition-colors">
                {showSignaturePassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {signatureFile && (
            <button type="button" onClick={() => {
              setSignatureFile(null); setSignatureBuffer(null); setSignaturePassword('');
              const clearedFeatures = { ...((businessInfo as any).features || {}), signatureP12: null, signaturePassword: '' };
              setBusinessInfo((prev: any) => ({ ...prev, features: clearedFeatures, isProduction: false }));
              saveBusinessField({ features: clearedFeatures });
              showNotify('Firma eliminada. El sistema volvió a modo pruebas automáticamente.');
            }}
              className="w-full py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all inline-flex items-center justify-center gap-2">
              <TrashIcon className="w-4 h-4" /> Eliminar Firma Digital
            </button>
          )}
        </div>

        <p className="text-[9px] text-slate-500 leading-relaxed italic">
          * Tu certificado y su contraseña se guardan en nuestros servidores para poder firmar tus comprobantes electrónicos.
        </p>
      </section>

      <button type="submit" onClick={saveBusinessConfig}
        className="w-full py-6 bg-sky-500 hover:bg-sky-600 text-white rounded-[2.5rem] font-black uppercase text-xs tracking-widest shadow-2xl shadow-sky-500/20 transition-all hover:scale-[1.02] active:scale-95">
        Guardar Cambios Legales
      </button>
    </div>
  );
};

export default ConfigSignatureSection;
