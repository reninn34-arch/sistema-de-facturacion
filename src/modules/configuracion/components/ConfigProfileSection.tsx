import React, { useRef } from 'react';
import { CameraIcon, SunIcon, MoonIcon, UserIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

interface ConfigProfileSectionProps {
  businessInfo: any;
  personalEmail: string;
  passwordData: { current: string; new: string; confirm: string };
  showProfilePassword: boolean;
  signatureFile: File | null;
  setBusinessInfo: (fn: (prev: any) => any) => void;
  setPersonalEmail: (v: string) => void;
  setPasswordData: (fn: (prev: any) => any) => void;
  setShowProfilePassword: (v: boolean) => void;
  handleUpdateProfile: () => void;
  handleChangePassword: () => void;
  toggleDarkMode: () => void;
  showNotify: (msg: string, type?: any) => void;
  saveBusinessField: (data: any) => void;
  logoInputRef: React.RefObject<HTMLInputElement | null>;
}

const ConfigProfileSection: React.FC<ConfigProfileSectionProps> = ({
  businessInfo, personalEmail, passwordData, showProfilePassword, signatureFile,
  setBusinessInfo, setPersonalEmail, setPasswordData, setShowProfilePassword,
  handleUpdateProfile, handleChangePassword, toggleDarkMode, showNotify,
  saveBusinessField, logoInputRef
}) => {
  const isUserAdmin = true;

  return (
    <>
      {/* Header del Perfil */}
      <div className="bg-white dark:bg-slate-800 p-10 rounded-[3.5rem] shadow-sm dark:shadow-lg dark:shadow-black/10 border border-slate-100 dark:border-slate-700/50 flex flex-col md:flex-row justify-between items-center gap-8 transition-colors duration-300">
        <div className="flex items-center gap-6">
          <div
            className="w-24 h-24 bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-[2.5rem] flex items-center justify-center cursor-pointer overflow-hidden group relative"
            onClick={() => isUserAdmin && logoInputRef.current?.click()}
          >
            {businessInfo.logo ? <img src={businessInfo.logo} className="w-full h-full object-cover" /> : <CameraIcon className="w-8 h-8 text-slate-300 dark:text-slate-600" />}
            {isUserAdmin && <div className="absolute inset-0 bg-sky-700/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-black text-white uppercase">Editar</div>}
            <input type="file" ref={logoInputRef as any} className="hidden" accept="image/*" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && file instanceof File) {
                const reader = new FileReader();
                reader.onloadend = () => {
                  const logoData = reader.result as string;
                  setBusinessInfo((prev: any) => ({ ...prev, logo: logoData }));
                  saveBusinessField({ logo: logoData });
                  showNotify('Logo guardado correctamente');
                };
                reader.readAsDataURL(file);
              }
            }} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">{businessInfo.tradename || businessInfo.name}</h2>
            <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">RUC: {businessInfo.ruc}</p>
          </div>
        </div>

        <div className="flex gap-4 flex-wrap items-center">
          <button onClick={() => {
            const newType = businessInfo.taxpayerType === 'EMPRESA' ? 'PERSONA_NATURAL' : 'EMPRESA';
            setBusinessInfo((prev: any) => ({ ...prev, taxpayerType: newType }));
            showNotify(`Cambiado a ${newType === 'EMPRESA' ? 'Empresa' : 'Persona Natural'}`);
          }}
            className={`px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl ${businessInfo.taxpayerType === 'EMPRESA' ? 'bg-sky-500 text-white shadow-sky-500/20' : 'bg-purple-600 text-white shadow-purple-600/20'}`}>
            {businessInfo.taxpayerType === 'EMPRESA' ? 'Empresa' : 'Persona Natural'}
          </button>
          <button onClick={toggleDarkMode}
            className={`px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl inline-flex items-center gap-2 ${(businessInfo as any).features?.isDarkMode ? 'bg-slate-900 border border-slate-700/50 text-white shadow-black/20 hover:bg-slate-950' : 'bg-amber-500 text-white shadow-amber-500/20 hover:bg-amber-600'}`}>
            {(businessInfo as any).features?.isDarkMode ? <><MoonIcon className="w-4 h-4" /> Modo Oscuro</> : <><SunIcon className="w-4 h-4" /> Modo Claro</>}
          </button>
          {!signatureFile && (
            <div className="px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-red-500 text-white shadow-red-500/20">⚠️ Firma electrónica no configurada</div>
          )}
        </div>
      </div>

      {/* Mi Cuenta Personal */}
      <section className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-700/50 shadow-sm dark:shadow-lg dark:shadow-black/10 space-y-8 transition-colors duration-300">
        <h3 className="font-black text-slate-800 dark:text-white text-xl uppercase tracking-tighter border-b border-slate-50 dark:border-slate-700/50 pb-4 flex items-center gap-3">
          <UserIcon className="w-6 h-6 text-purple-500" /> Mi Cuenta (Acceso Personal)
        </h3>
        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Correo Electrónico Personal (Login)</label>
            <div className="flex gap-2">
              <input type="email" value={personalEmail} onChange={(e) => setPersonalEmail(e.target.value)}
                className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-purple-500 transition-colors" />
              <button onClick={handleUpdateProfile} className="px-6 bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-2xl font-bold text-xs hover:bg-purple-200 dark:hover:bg-purple-500/20 transition-colors">Guardar</button>
            </div>
          </div>
          <div className="pt-6 border-t border-slate-50 dark:border-slate-700/50">
            <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 mb-4">Cambiar Contraseña</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <input type={showProfilePassword ? "text" : "password"} placeholder="Contraseña Actual"
                  value={passwordData.current} onChange={(e) => setPasswordData((prev: any) => ({ ...prev, current: e.target.value }))}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-purple-500 transition-colors pr-10" />
                <button type="button" onClick={() => setShowProfilePassword(!showProfilePassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showProfilePassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>
              <div className="relative">
                <input type={showProfilePassword ? "text" : "password"} placeholder="Nueva Contraseña"
                  value={passwordData.new} onChange={(e) => setPasswordData((prev: any) => ({ ...prev, new: e.target.value }))}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-purple-500 transition-colors pr-10" />
              </div>
              <input type={showProfilePassword ? "text" : "password"} placeholder="Confirmar Nueva"
                value={passwordData.confirm} onChange={(e) => setPasswordData((prev: any) => ({ ...prev, confirm: e.target.value }))}
                className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 dark:text-white rounded-2xl font-bold text-sm outline-none border-2 border-transparent focus:border-purple-500 transition-colors" />
            </div>
            <button onClick={handleChangePassword} disabled={!passwordData.current || !passwordData.new}
              className="mt-4 w-full md:w-auto px-8 py-3 bg-slate-800 dark:bg-slate-700 text-white rounded-2xl font-bold text-xs hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest">
              Actualizar Contraseña
            </button>
          </div>
        </div>
      </section>
    </>
  );
};

export default ConfigProfileSection;
