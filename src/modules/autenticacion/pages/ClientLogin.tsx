import React, { useState, useId } from 'react';
import { EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon, ShieldCheckIcon, ExclamationCircleIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

const ClientLogin = () => {
  const fieldId = useId();
  const [identification, setIdentification] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const API_URL = import.meta.env.VITE_BACKEND_URL || '';
      const response = await fetch(`${API_URL}/api/auth/client/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identification, password }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('clientToken', 'cookie_authenticated');
        localStorage.setItem('clientUser', JSON.stringify(data.user));
        if (data.requirePasswordChange) {
          localStorage.setItem('requirePasswordChange', 'true');
        }
        window.location.href = '/portal/dashboard';
      } else {
        setError(data.message || 'Credenciales incorrectas. Verifique su Cédula/RUC.');
      }
    } catch (err) {
      console.error(err);
      setError('Error de conexión con el servidor. Intente más tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-sky-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 transition-colors duration-300">
      <header className="flex items-center justify-between border-b border-sky-100 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-10 py-3 sticky top-0 z-50">
        <div className="flex items-center gap-3 text-sky-500 dark:text-sky-400">
          <div className="w-8 h-8 bg-sky-700 rounded-lg flex items-center justify-center">
            <DocumentTextIcon className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-slate-900 dark:text-white text-lg font-bold tracking-tight">Portal de Facturación</h2>
        </div>
        <div className="flex gap-8">
          <a className="text-slate-500 dark:text-slate-400 text-sm font-medium hover:text-sky-500 dark:hover:text-sky-400 transition-colors" href="/">Inicio</a>
          <a className="text-slate-500 dark:text-slate-400 text-sm font-medium hover:text-sky-500 dark:hover:text-sky-400 transition-colors" href="#">Ayuda</a>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[480px] flex flex-col gap-6 animate-slide-up">
          <div className="text-center space-y-2">
            <h1 className="text-slate-900 dark:text-white tracking-tight text-3xl font-bold">Consulta de Facturas</h1>
            <p className="text-slate-500 dark:text-slate-400 text-base">Ingrese su identificación para acceder a sus comprobantes electrónicos.</p>
          </div>

          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700">

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2" role="alert">
                <ExclamationCircleIcon className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form className="flex flex-col gap-5" onSubmit={handleLogin}>
              <div className="flex flex-col gap-2">
                <label htmlFor={`${fieldId}-identification`} className="text-slate-700 dark:text-slate-200 text-sm font-semibold">Número de Cédula o RUC</label>
                <div className="flex w-full items-stretch rounded-lg group">
                  <div className="text-slate-400 flex border border-r-0 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 items-center justify-center px-3 rounded-l-lg">
                    <DocumentTextIcon className="w-5 h-5" />
                  </div>
                  <input
                    className="flex w-full min-w-0 flex-1 rounded-r-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:border-sky-500 h-12 placeholder:text-slate-400 p-3 text-base"
                    id={`${fieldId}-identification`}
                    placeholder="Ej: 1712345678"
                    type="text"
                    value={identification}
                    onChange={(e) => setIdentification(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label htmlFor={`${fieldId}-password`} className="text-slate-700 dark:text-slate-200 text-sm font-semibold">Contraseña</label>
                  <a href="/portal/reset-password" className="text-sky-500 dark:text-sky-400 text-xs font-bold hover:underline">Olvidaste tu contraseña?</a>
                </div>
                <div className="flex w-full items-stretch rounded-lg group">
                  <div className="text-slate-400 flex border border-r-0 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 items-center justify-center px-3 rounded-l-lg">
                    <LockClosedIcon className="w-5 h-5" />
                  </div>
                  <div className="relative flex-1">
                    <input
                      className="w-full rounded-r-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:border-sky-500 h-12 placeholder:text-slate-400 p-3 text-base pr-10"
                      id={`${fieldId}-password`}
                      placeholder="Primer acceso: ingrese su Cédula o RUC"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                className="w-full flex items-center justify-center rounded-lg h-12 px-5 bg-sky-500 text-white text-base font-bold shadow-lg shadow-sky-500/20 hover:bg-sky-600 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                type="submit"
                disabled={loading}
              >
                <span>{loading ? 'Verificando...' : 'Consultar Facturas'}</span>
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 flex flex-col items-center gap-4">
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                ¿Problemas para ingresar?
                <a className="text-sky-500 dark:text-sky-400 font-bold hover:underline ml-1" href="#">Contactar Soporte</a>
              </p>
              <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 px-3 py-1 bg-slate-50 dark:bg-slate-700/50 rounded-full border border-slate-200 dark:border-slate-600">
                <ShieldCheckIcon className="w-4 h-4" />
                <span className="text-[10px] uppercase tracking-widest font-bold">Conexión Segura SSL</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            <div className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 bg-white/50 dark:bg-slate-800/50 rounded-full flex items-center justify-center">
                <ShieldCheckIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
              </div>
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter">Protección de Datos</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 bg-white/50 dark:bg-slate-800/50 rounded-full flex items-center justify-center">
                <DocumentTextIcon className="w-6 h-6 text-slate-600 dark:text-slate-300" />
              </div>
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter">Facturación Electrónica</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="p-6 text-center text-slate-400 dark:text-slate-600 text-xs border-t border-slate-200 dark:border-slate-800">
        <p>&copy; {new Date().getFullYear()} Portal de Facturación. Todos los derechos reservados. Sistema de Facturación Autorizado.</p>
      </footer>
    </div>
  );
};

export default ClientLogin;
